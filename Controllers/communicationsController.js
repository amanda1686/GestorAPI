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

async function resolveRecipients({ mode, recipientNumApis, targetNivel, includeAdmins }) {
  const normalizedMode = String(mode ?? "").toLowerCase();
  const baseQuery = { Num_api: { $ne: null } };

  if (!includeAdmins) {
    baseQuery.Nivel = { $ne: 1 };
  }

  if (normalizedMode === "nivel") {
    const nivel = Number(targetNivel);
    if (!Number.isInteger(nivel)) {
      const error = new Error("Nivel objetivo invalido");
      error.statusCode = 400;
      throw error;
    }
    baseQuery.Nivel = nivel;
  } else if (normalizedMode === "list" || normalizedMode === "seleccionados") {
    const provided = Array.isArray(recipientNumApis) ? recipientNumApis : [];
    const sanitized = Array.from(
      new Set(
        provided
          .map((value) => normalizeNumApi(value))
          .filter(Boolean)
      )
    );
    const numericValues = sanitized
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (numericValues.length === 0) {
      const error = new Error("Debe enviar al menos un destinatario valido");
      error.statusCode = 400;
      throw error;
    }
    baseQuery.Num_api = { $in: numericValues };
  } else if (normalizedMode === "all" || normalizedMode === "todos") {
    // sin filtros adicionales
  } else {
    const error = new Error("Modo de destinatarios no soportado");
    error.statusCode = 400;
    error.details = { mode };
    throw error;
  }

  const rows = await EjercienteModel.find(baseQuery)
    .select(BASE_RECIPIENT_ATTRIBUTES.join(" "))
    .lean();

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
    archived,
    deleted,
  };
}

function mapCommunicationForAdmin(communication, recipientMetaMap) {
  const recipients = (communication.recipients ?? []).map((recipient) => {
    const meta = recipientMetaMap.get(recipient.recipient_num_api) ?? {};
    return {
      num_api: recipient.recipient_num_api,
      read_at: recipient.read_at ?? null,
      archived: Boolean(recipient.archived),
      deleted: Boolean(recipient.deleted),
      nombre: meta.Nombre ?? null,
      apellidos: meta.Apellidos ?? null,
      nivel: meta.Nivel ?? null,
      email: meta.email ?? null,
      colegio: meta.Colegio ?? null,
    };
  });

  return {
    id: communication.id,
    subject: communication.subject,
    body: communication.body,
    sender_num_api: communication.sender_num_api,
    created_at: communication.created_at,
    recipients,
    stats: computeRecipientStats(communication.recipients ?? []),
  };
}

function mapCommunicationForRecipient(communication, recipientRecord) {
  return {
    id: communication.id,
    subject: communication.subject,
    body: communication.body,
    sender_num_api: communication.sender_num_api,
    created_at: communication.created_at,
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
    let communication;

    try {
      communication = await Communication.create({
        sender_num_api: senderNumApi,
        subject,
        body,
      });

      const recipientDocs = recipients.map((recipient) => ({
        communication_id: communication.id,
        recipient_num_api: recipient.Num_api,
      }));

      if (recipientDocs.length > 0) {
        await CommunicationRecipient.create(recipientDocs);
      }

      const truncatedMessage = truncate(body, MAX_NOTIFICATION_MESSAGE);
      const notificationPayload = recipients.map((recipient) => ({
        user_num_api: recipient.Num_api,
        title: subject.slice(0, 180),
        message: truncatedMessage,
        kind: "announcement",
        link,
      }));
      if (notificationPayload.length > 0) {
        await Notification.create(notificationPayload);
      }
    } catch (error) {
      if (communication?.id) {
        await CommunicationRecipient.deleteMany({ communication_id: communication.id }).catch(() => {});
        await Communication.deleteOne({ id: communication.id }).catch(() => {});
      }
      throw error;
    }

    const recipientsPreview = recipients.slice(0, 5).map(formatRecipientPreview);
    return res.status(201).json({
      message: "Comunicacion enviada",
      data: {
        id: communication.id,
        subject: communication.subject,
        body: communication.body,
        created_at: communication.created_at,
        sender_num_api: communication.sender_num_api,
        recipient_count: recipients.length,
        recipients_preview: recipientsPreview,
      },
    });
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
    const includeBody = ["1", "true"].includes(String(req.query?.includeBody ?? "").toLowerCase());
    const limit = Math.min(Number(req.query?.limit ?? 20) || 20, 100);
    const offset = Number(req.query?.offset ?? 0) || 0;

    const where = {};
    if (scope !== "all") {
      where.sender_num_api = getSenderNumApi(req.user);
    }

    const [rows, count] = await Promise.all([
      Communication.find(where)
        .sort({ created_at: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Communication.countDocuments(where),
    ]);

    const communicationIds = rows.map((row) => row.id);
    const recipientDocs = communicationIds.length
      ? await CommunicationRecipient.find({ communication_id: { $in: communicationIds } }).lean()
      : [];

    const recipientsByCommunication = new Map();
    for (const recipient of recipientDocs) {
      const list = recipientsByCommunication.get(recipient.communication_id) ?? [];
      list.push(recipient);
      recipientsByCommunication.set(recipient.communication_id, list);
    }

    const items = rows.map((row) => {
      const recipients = recipientsByCommunication.get(row.id) ?? [];
      const item = {
        id: row.id,
        subject: row.subject,
        created_at: row.created_at,
        sender_num_api: row.sender_num_api,
        stats: computeRecipientStats(recipients),
      };
      if (includeBody) {
        item.body = row.body;
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

    const communication = await Communication.findByPk(id, { lean: true });
    if (!communication) {
      return res.status(404).json({ error: "Comunicacion no encontrada" });
    }

    const recipients = await CommunicationRecipient.find({ communication_id: id }).lean();
    communication.recipients = recipients;

    const userNumApi = normalizeNumApi(req.user?.Num_api);
    const isAdmin = Number(req.user?.Nivel) === 1;
    const recipientRecord = recipients.find((recipient) => recipient.recipient_num_api === userNumApi);

    if (!isAdmin && !recipientRecord) {
      return res.status(403).json({ error: "No tienes permisos para ver esta comunicacion" });
    }

    if (isAdmin) {
      const recipientIds = recipients
        .map((recipient) => recipient.recipient_num_api)
        .filter(Boolean);
      const numericIds = recipientIds
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      const metaRows = numericIds.length
        ? await EjercienteModel.find({ Num_api: { $in: numericIds } })
            .select(BASE_RECIPIENT_ATTRIBUTES.join(" "))
            .lean()
        : [];
      const metaMap = new Map(metaRows.map((row) => [normalizeNumApi(row.Num_api), row]));
      return res.json(mapCommunicationForAdmin(communication, metaMap));
    }

    return res.json(mapCommunicationForRecipient(communication, recipientRecord));
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
    const includeBody = ["1", "true"].includes(String(req.query?.includeBody ?? "").toLowerCase());
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

    const [rows, count] = await Promise.all([
      CommunicationRecipient.find(where)
        .sort({ created_at: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      CommunicationRecipient.countDocuments(where),
    ]);

    const communicationIds = rows.map((row) => row.communication_id);
    const communications = communicationIds.length
      ? await Communication.find({ id: { $in: communicationIds } })
          .select({ id: 1, subject: 1, body: 1, sender_num_api: 1, created_at: 1 })
          .lean()
      : [];
    const communicationMap = new Map(communications.map((item) => [item.id, item]));

    const items = rows
      .map((recipient) => {
        const communication = communicationMap.get(recipient.communication_id);
        if (!communication) return null;
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
      })
      .filter(Boolean);

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
      communication_id: id,
      recipient_num_api: userNumApi,
    });

    if (!record) {
      return res.status(404).json({ error: "Comunicacion no encontrada para el destinatario" });
    }

    if (!record.read_at) {
      record.read_at = new Date();
      record.updated_at = new Date();
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

    const result = await CommunicationRecipient.updateOne(
      {
        communication_id: id,
        recipient_num_api: userNumApi,
      },
      {
        $set: {
          archived,
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
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

    const result = await CommunicationRecipient.updateOne(
      {
        communication_id: id,
        recipient_num_api: userNumApi,
      },
      {
        $set: {
          deleted: true,
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    return res.json({ message: "Eliminado de la bandeja" });
  } catch (error) {
    console.error("[communications] Error eliminando:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}
