import { Op } from "sequelize";
import { Notification, NOTIFICATION_KINDS } from "../Models/notification.js";

function normalizeNumApi(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export async function createNotification(req, res) {
  try {
    const requesterNumApi = normalizeNumApi(req.user?.Num_api);
    if (!requesterNumApi) {
      return res.status(400).json({ error: "El usuario no tiene Num_api asociado" });
    }

    const requesterNivel = Number(req.user?.Nivel);
    const targetNumApi = normalizeNumApi(
      req.body?.targetNumApi ??
        req.body?.target_num_api ??
        req.body?.user_num_api ??
        req.body?.num_api ??
        requesterNumApi
    );

    if (!targetNumApi) {
      return res.status(400).json({ error: "Debe indicar un Num_api valido" });
    }

    if (targetNumApi !== requesterNumApi && requesterNivel !== 1) {
      return res
        .status(403)
        .json({ error: "No tienes permisos para crear notificaciones a otros usuarios" });
    }

    const title = String(req.body?.title ?? "").trim();
    const message = String(req.body?.message ?? "").trim();
    const kindRaw = String(req.body?.kind ?? "").trim().toLowerCase();
    const link = req.body?.link ? String(req.body.link).trim() : null;

    if (!title) {
      return res.status(400).json({ error: "El titulo es obligatorio" });
    }
    if (title.length > 180) {
      return res.status(400).json({ error: "El titulo supera los 180 caracteres" });
    }
    if (!message) {
      return res.status(400).json({ error: "El mensaje es obligatorio" });
    }
    if (message.length > 500) {
      return res.status(400).json({ error: "El mensaje supera los 500 caracteres" });
    }
    if (link && link.length > 300) {
      return res.status(400).json({ error: "El link supera los 300 caracteres" });
    }

    const kind = kindRaw || "info";
    if (!NOTIFICATION_KINDS.includes(kind)) {
      return res.status(400).json({
        error: "Tipo de notificacion invalido",
        allowedKinds: NOTIFICATION_KINDS,
      });
    }

    const notification = await Notification.create({
      user_num_api: targetNumApi,
      title,
      message,
      kind,
      link: link || null,
    });

    return res.status(201).json({
      message: "Notificacion creada",
      data: notification.get({ plain: true }),
    });
  } catch (error) {
    console.error("[notifications] Error creando:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function listNotifications(req, res) {
  try {
    const userNumApi = normalizeNumApi(req.user?.Num_api);
    if (!userNumApi) {
      return res.status(400).json({ error: "El usuario no tiene Num_api asociado" });
    }

    const status = String(req.query?.status ?? "unread").toLowerCase();
    const limit = Math.min(Number(req.query?.limit ?? 20) || 20, 100);
    const offset = Number(req.query?.offset ?? 0) || 0;

    const where = {
      user_num_api: userNumApi,
    };

    if (status === "unread") {
      where.read_at = null;
    } else if (status === "read") {
      where.read_at = { [Op.not]: null };
    }

    const { rows, count } = await Notification.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    const items = rows.map((row) => row.get({ plain: true }));

    return res.json({ total: count, limit, offset, items });
  } catch (error) {
    console.error("[notifications] Error listando:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const id = Number(req.params?.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalido" });
    }

    const userNumApi = normalizeNumApi(req.user?.Num_api);
    if (!userNumApi) {
      return res.status(400).json({ error: "El usuario no tiene Num_api asociado" });
    }

    const notification = await Notification.findOne({
      where: {
        id,
        user_num_api: userNumApi,
      },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notificacion no encontrada" });
    }

    if (!notification.read_at) {
      notification.read_at = new Date();
      await notification.save();
    }

    return res.json({ message: "Marcada como leida", read_at: notification.read_at });
  } catch (error) {
    console.error("[notifications] Error marcando lectura:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    const userNumApi = normalizeNumApi(req.user?.Num_api);
    if (!userNumApi) {
      return res.status(400).json({ error: "El usuario no tiene Num_api asociado" });
    }

    const [updated] = await Notification.update(
      { read_at: new Date() },
      {
        where: {
          user_num_api: userNumApi,
          read_at: null,
        },
      }
    );

    return res.json({ message: "Notificaciones actualizadas", updated });
  } catch (error) {
    console.error("[notifications] Error marcando todas como leidas:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function deleteNotification(req, res) {
  try {
    const id = Number(req.params?.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalido" });
    }

    const userNumApi = normalizeNumApi(req.user?.Num_api);
    if (!userNumApi) {
      return res.status(400).json({ error: "El usuario no tiene Num_api asociado" });
    }

    const deleted = await Notification.destroy({
      where: {
        id,
        user_num_api: userNumApi,
      },
    });

    if (!deleted) {
      return res.status(404).json({ error: "Notificacion no encontrada" });
    }

    return res.json({ message: "Notificacion eliminada" });
  } catch (error) {
    console.error("[notifications] Error eliminando:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}
