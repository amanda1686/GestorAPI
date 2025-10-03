import { Op } from "sequelize";
import db from "../database/db.js";
import EjercienteModel from "../Models/ejercientes.js";
import { Communication, CommunicationRecipient } from "../Models/communication.js";
import { Notification } from "../Models/notification.js";

const MAX_NOTIFICATION_MESSAGE = 500;
const BASE_RECIPIENT_ATTRIBUTES = [
  "IdEjerciente",
  "Num_api",
  "Nombre",
  "Apellidos",
  "Nivel",
  "email",
  "Colegio",
];

function normalizeNumApi(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function getSenderNumApi(user) {
  return (
    normalizeNumApi(user?.Num_api) ??
    normalizeNumApi(user?.NumApi) ??
    `ID-${user?.IdEjerciente ?? user?.id ?? "DESCONOCIDO"}`
  );
}

function truncate(value, maxLength) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!maxLength || text.length <= maxLength) return text;
  const safeEnd = Math.max(0, maxLength - 3);
  return `${text.slice(0, safeEnd)}...`;
}
async function resolveRecipients({
  mode,
  recipientNumApis,
  targetNivel,
  includeAdmins,
}) {
  const normalizedMode = String(mode ?? "").toLowerCase();
  const baseWhere = {
    Num_api: { [Op.not]: null },
  };

  if (!includeAdmins) {
    baseWhere.Nivel = { [Op.ne]: 1 };
  }

  if (normalizedMode === "nivel") {
    const nivel = Number(targetNivel);
    if (!Number.isInteger(nivel)) {
      const error = new Error("Nivel objetivo invalido");
      error.statusCode = 400;
      throw error;
    }
    baseWhere.Nivel = nivel;
  } else if (normalizedMode === "list" || normalizedMode === "seleccionados") {
    const provided = Array.isArray(recipientNumApis) ? recipientNumApis : [];
    const sanitized = Array.from(
      new Set(
        provided
          .map((value) => normalizeNumApi(value))
          .filter(Boolean)
      )
    );
    if (sanitized.length === 0) {
      const error = new Error("Debe enviar al menos un destinatario valido");
      error.statusCode = 400;
      throw error;
    }
    baseWhere.Num_api = sanitized;
  } else if (normalizedMode === "all" || normalizedMode === "todos") {
    // sin filtros adicionales
  } else {
    const error = new Error("Modo de destinatarios no soportado");
    error.statusCode = 400;
    error.details = { mode };
    throw error;
  }

  const rows = await EjercienteModel.findAll({
    attributes: BASE_RECIPIENT_ATTRIBUTES,
    where: baseWhere,
    raw: true,
  });

  const recipients = [];
  const seen = new Set();
  for (const row of rows) {
    const numApi = normalizeNumApi(row.Num_api);
    if (!numApi || seen.has(numApi)) continue;
    seen.add(numApi);
    recipients.push({ ...row, Num_api: numApi });
  }

  return recipients;
}

function formatRecipientPreview(recipient) {
  const nombre = [recipient.Nombre, recipient.Apellidos]
    .filter((value) => Boolean(String(value ?? "").trim()))
    .join(" ")
    .trim();
  return {
    num_api: recipient.Num_api,
    nombre: nombre || null,
    nivel: recipient.Nivel ?? null,
    email: recipient.email ?? null,
  };
}

function computeRecipientStats(recipients = []) {
  const total = recipients.length;
  let read = 0;
  let archived = 0;
  let deleted = 0;
  for (const recipient of recipients) {
    if (recipient.read_at) read += 1;
    if (recipient.archived) archived += 1;
    if (recipient.deleted) deleted += 1;
  }
  return {
    total,
    read,
    unread: total - read,
    archived,
    deleted,
  };
}

function mapCommunicationForAdmin(plainCommunication, recipientMetaMap) {
  const recipients = (plainCommunication.recipients ?? []).map((recipient) => {
    const meta = recipientMetaMap.get(recipient.recipient_num_api) ?? {};
    return {
      num_api: recipient.recipient_num_api,
      read_at: recipient.read_at,
      archived: recipient.archived,
      deleted: recipient.deleted,
      nombre: meta.Nombre ?? null,
      apellidos: meta.Apellidos ?? null,
      nivel: meta.Nivel ?? null,
      email: meta.email ?? null,
      colegio: meta.Colegio ?? null,
    };
  });

  return {
    id: plainCommunication.id,
    subject: plainCommunication.subject,
    body: plainCommunication.body,
    sender_num_api: plainCommunication.sender_num_api,
    created_at: plainCommunication.created_at,
    recipients,
    stats: computeRecipientStats(plainCommunication.recipients ?? []),
  };
}

function mapCommunicationForRecipient(plainCommunication, recipientRecord) {
  return {
    id: plainCommunication.id,
    subject: plainCommunication.subject,
    body: plainCommunication.body,
    sender_num_api: plainCommunication.sender_num_api,
    created_at: plainCommunication.created_at,
    read_at: recipientRecord?.read_at ?? null,
    archived: Boolean(recipientRecord?.archived),
    deleted: Boolean(recipientRecord?.deleted),
  };
}

export async function sendCommunication(req, res) {
  try {
    const subject = String(req.body?.subject ?? "").trim();
    const body = String(req.body?.body ?? "").trim();
    const recipientMode = req.body?.recipientMode ?? req.body?.mode ?? "all";
    const includeAdmins = Boolean(req.body?.includeAdmins);
    const link = req.body?.link ? String(req.body.link).trim() : null;

    if (!subject) {
      return res.status(400).json({ error: "El asunto es obligatorio" });
    }
    if (subject.length > 200) {
      return res.status(400).json({ error: "El asunto supera los 200 caracteres" });
    }
    if (!body) {
      return res.status(400).json({ error: "El cuerpo del mensaje es obligatorio" });
    }

    const recipients = await resolveRecipients({
      mode: recipientMode,
      recipientNumApis: req.body?.recipientNumApis ?? req.body?.recipients,
      targetNivel: req.body?.targetNivel ?? req.body?.nivel,
      includeAdmins,
    });

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No se encontraron destinatarios" });
    }

    const senderNumApi = getSenderNumApi(req.user);
    const transaction = await db.transaction();

    try {
      const communication = await Communication.create(
        {
          sender_num_api: senderNumApi,
          subject,
          body,
        },
        { transaction }
      );

      const recipientRows = recipients.map((recipient) => ({
        communication_id: communication.id,
        recipient_num_api: recipient.Num_api,
      }));
      await CommunicationRecipient.bulkCreate(recipientRows, { transaction });

      const truncatedMessage = truncate(body, MAX_NOTIFICATION_MESSAGE);
      const notificationPayload = recipients.map((recipient) => ({
        user_num_api: recipient.Num_api,
        title: subject.slice(0, 180),
        message: truncatedMessage,
        kind: "announcement",
        link,
      }));
      if (notificationPayload.length > 0) {
        await Notification.bulkCreate(notificationPayload, { transaction });
      }

      await transaction.commit();

      const plain = communication.get({ plain: true });
      return res.status(201).json({
        message: "Comunicacion enviada",
        data: {
          id: plain.id,
          subject: plain.subject,
          body: plain.body,
          created_at: plain.created_at,
          sender_num_api: plain.sender_num_api,
          recipient_count: recipients.length,
          recipients_preview: recipients.slice(0, 5).map(formatRecipientPreview),
        },
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error("[communications] Error al enviar:", error);
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function listSentCommunications(req, res) {
  try {
    const scope = String(req.query?.scope ?? "mine").toLowerCase();
    const includeBody = ["1", "true"].includes(String(req.query?.includeBody ?? "" ).toLowerCase());
    const limit = Math.min(Number(req.query?.limit ?? 20) || 20, 100);
    const offset = Number(req.query?.offset ?? 0) || 0;

    const where = {};
    if (scope !== "all") {
      where.sender_num_api = getSenderNumApi(req.user);
    }

    const { rows, count } = await Communication.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: CommunicationRecipient,
          as: "recipients",
          attributes: ["recipient_num_api", "read_at", "archived", "deleted"],
        },
      ],
    });

    const items = rows.map((row) => {
      const plain = row.get({ plain: true });
      const item = {
        id: plain.id,
        subject: plain.subject,
        created_at: plain.created_at,
        sender_num_api: plain.sender_num_api,
        stats: computeRecipientStats(plain.recipients ?? []),
      };
      if (includeBody) {
        item.body = plain.body;
      }
      return item;
    });

    return res.json({
      total: count,
      limit,
      offset,
      items,
    });
  } catch (error) {
    console.error("[communications] Error listando enviados:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function getCommunicationDetail(req, res) {
  try {
    const id = Number(req.params?.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalido" });
    }

    const communication = await Communication.findByPk(id, {
      include: [
        {
          model: CommunicationRecipient,
          as: "recipients",
          attributes: ["recipient_num_api", "read_at", "archived", "deleted"],
        },
      ],
    });

    if (!communication) {
      return res.status(404).json({ error: "Comunicacion no encontrada" });
    }

    const plain = communication.get({ plain: true });
    const userNumApi = normalizeNumApi(req.user?.Num_api);
    const isAdmin = Number(req.user?.Nivel) === 1;
    const recipientRecord = (plain.recipients ?? []).find(
      (recipient) => recipient.recipient_num_api === userNumApi
    );

    if (!isAdmin && !recipientRecord) {
      return res.status(403).json({ error: "No tienes permisos para ver esta comunicacion" });
    }

    if (isAdmin) {
      const recipientIds = (plain.recipients ?? []).map((recipient) => recipient.recipient_num_api);
      const metaRows = await EjercienteModel.findAll({
        attributes: BASE_RECIPIENT_ATTRIBUTES,
        where: { Num_api: recipientIds },
        raw: true,
      });
      const metaMap = new Map(metaRows.map((row) => [normalizeNumApi(row.Num_api), row]));
      return res.json(mapCommunicationForAdmin(plain, metaMap));
    }

    return res.json(mapCommunicationForRecipient(plain, recipientRecord));
  } catch (error) {
    console.error("[communications] Error obteniendo detalle:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function listInbox(req, res) {
  try {
    const userNumApi = normalizeNumApi(req.user?.Num_api);
    if (!userNumApi) {
      return res.status(400).json({ error: "El usuario no tiene Num_api asociado" });
    }

    const status = String(req.query?.status ?? "active").toLowerCase();
    const includeBody = ["1", "true"].includes(String(req.query?.includeBody ?? "" ).toLowerCase());
    const limit = Math.min(Number(req.query?.limit ?? 20) || 20, 100);
    const offset = Number(req.query?.offset ?? 0) || 0;

    const where = {
      recipient_num_api: userNumApi,
    };

    if (status === "archived") {
      where.archived = true;
      where.deleted = false;
    } else if (status === "unread") {
      where.read_at = null;
      where.deleted = false;
      where.archived = false;
    } else if (status === "deleted") {
      where.deleted = true;
    } else {
      where.deleted = false;
    }

    const { rows, count } = await CommunicationRecipient.findAndCountAll({
      where,
      limit,
      offset,
      order: [[{ model: Communication, as: "communication" }, "created_at", "DESC"]],
      include: [
        {
          model: Communication,
          as: "communication",
          attributes: ["id", "subject", "body", "sender_num_api", "created_at"],
        },
      ],
    });

    const items = rows.map((row) => {
      const recipient = row.get({ plain: true });
      const communication = recipient.communication;
      const item = {
        id: communication.id,
        subject: communication.subject,
        body_preview: truncate(communication.body, 200),
        sender_num_api: communication.sender_num_api,
        created_at: communication.created_at,
        read_at: recipient.read_at,
        archived: recipient.archived,
        deleted: recipient.deleted,
      };
      if (includeBody) {
        item.body = communication.body;
      }
      return item;
    });

    return res.json({
      total: count,
      limit,
      offset,
      items,
    });
  } catch (error) {
    console.error("[communications] Error listando bandeja:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function markCommunicationRead(req, res) {
  try {
    const id = Number(req.params?.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalido" });
    }

    const userNumApi = normalizeNumApi(req.user?.Num_api);
    if (!userNumApi) {
      return res.status(400).json({ error: "El usuario no tiene Num_api asociado" });
    }

    const record = await CommunicationRecipient.findOne({
      where: {
        communication_id: id,
        recipient_num_api: userNumApi,
      },
    });

    if (!record) {
      return res.status(404).json({ error: "Comunicacion no encontrada para el destinatario" });
    }

    if (!record.read_at) {
      record.read_at = new Date();
      await record.save();
    }

    return res.json({ message: "Marcado como leido", read_at: record.read_at });
  } catch (error) {
    console.error("[communications] Error marcando lectura:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function toggleCommunicationArchive(req, res) {
  try {
    const id = Number(req.params?.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalido" });
    }

    const userNumApi = normalizeNumApi(req.user?.Num_api);
    if (!userNumApi) {
      return res.status(400).json({ error: "El usuario no tiene Num_api asociado" });
    }

    const archived = Boolean(req.body?.archived);

    const [updated] = await CommunicationRecipient.update(
      { archived },
      {
        where: {
          communication_id: id,
          recipient_num_api: userNumApi,
        },
      }
    );

    if (updated === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    return res.json({ message: archived ? "Archivado" : "Restaurado" });
  } catch (error) {
    console.error("[communications] Error archivando:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function deleteCommunication(req, res) {
  try {
    const id = Number(req.params?.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalido" });
    }

    const userNumApi = normalizeNumApi(req.user?.Num_api);
    if (!userNumApi) {
      return res.status(400).json({ error: "El usuario no tiene Num_api asociado" });
    }

    const [updated] = await CommunicationRecipient.update(
      { deleted: true },
      {
        where: {
          communication_id: id,
          recipient_num_api: userNumApi,
        },
      }
    );

    if (updated === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    return res.json({ message: "Eliminado de la bandeja" });
  } catch (error) {
    console.error("[communications] Error eliminando:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}
