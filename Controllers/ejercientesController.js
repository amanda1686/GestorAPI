import nodemailer from "nodemailer";
import { randomBytes, pbkdf2Sync } from "crypto";
import EjercienteModel from "../Models/ejercientes.js";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const transporter = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === "true",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

async function enviarCorreo(destinatario, asunto, mensaje) {
  if (!transporter) {
    console.warn("[mailer] Configuracion SMTP incompleta. No se envio correo.");
    return false;
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: destinatario,
      subject: asunto,
      text: mensaje,
    });
    return true;
  } catch (error) {
    console.error("[mailer] Error enviando correo:", error);
    return false;
  }
}

function hashPassword(contrasena) {
  if (!contrasena) return contrasena;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(contrasena, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function sanitizeEjercienteResponse(ejerciente) {
  if (!ejerciente) return ejerciente;
  const data = ejerciente.toJSON ? ejerciente.toJSON() : { ...ejerciente };
  delete data.contrasena;
  return data;
}

const ESTADOS_VALIDOS = ["activo", "pendiente", "inactivo"];

const CAMPOS_PERMITIDOS = new Set([
  "IdEjerciente",
  "Num_api",
  "Nombre",
  "Apellidos",
  "Nombre_Comercial",
  "Direccion",
  "cp",
  "Localidad",
  "Provincia",
  "telefono_1",
  "telefono_2",
  "fax",
  "Movil",
  "email",
  "url",
  "imagen",
  "usuario",
  "contrasena",
  "Colegio",
  "apilocal",
  "web",
  "tasapi",
  "visados",
  "IdCoapi",
  "Nivel",
  "imgcom",
  "estado",
]);

function limpiarPayload(body) {
  const payload = {};
  for (const [clave, valor] of Object.entries(body ?? {})) {
    if (CAMPOS_PERMITIDOS.has(clave)) {
      payload[clave] = valor;
    }
  }
  return payload;
}

export const cambiarContrasena = async (req, res) => {
  try {
    const { contrasena } = req.body;
    if (!contrasena) {
      return res.status(400).json({ error: "La contrasena es obligatoria" });
    }

    const [updated] = await EjercienteModel.update(
      { contrasena: hashPassword(contrasena) },
      { where: { IdEjerciente: req.params.id } }
    );
    if (!updated) return res.status(404).json({ error: "No encontrado" });
    res.json({ message: "Contrasena actualizada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const crearEjerciente = async (req, res) => {
  try {
    const payload = limpiarPayload(req.body);
    const plainPassword = payload.contrasena;
    if (plainPassword) {
      payload.contrasena = hashPassword(plainPassword);
    }

    const nuevo = await EjercienteModel.create(payload);

    if (nuevo.email && plainPassword) {
      const correoEnviado = await enviarCorreo(
        nuevo.email,
        "Tu contrasena de acceso",
        `Hola ${nuevo.Nombre ?? ""}, tu contrasena es: ${plainPassword}`
      );

      if (!correoEnviado) {
        console.warn("[mailer] Registro creado pero el correo no pudo enviarse.");
      }
    }

    res.status(201).json(sanitizeEjercienteResponse(nuevo));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listarEjercientes = async (_req, res) => {
  try {
    const ejercientes = await EjercienteModel.findAll();
    res.json(ejercientes.map(sanitizeEjercienteResponse));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const obtenerEjerciente = async (req, res) => {
  try {
    const ejerciente = await EjercienteModel.findByPk(req.params.id);
    if (!ejerciente) return res.status(404).json({ error: "No encontrado" });
    res.json(sanitizeEjercienteResponse(ejerciente));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const actualizarEjerciente = async (req, res) => {
  try {
    const payload = limpiarPayload(req.body);

    if (payload.contrasena) {
      payload.contrasena = hashPassword(payload.contrasena);
    }

    const [updated] = await EjercienteModel.update(payload, {
      where: { IdEjerciente: req.params.id },
    });
    if (!updated) return res.status(404).json({ error: "No encontrado" });

    const actualizado = await EjercienteModel.findByPk(req.params.id);
    res.json({ message: "Actualizado", data: sanitizeEjercienteResponse(actualizado) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const eliminarEjerciente = async (req, res) => {
  try {
    const deleted = await EjercienteModel.destroy({
      where: { IdEjerciente: req.params.id },
    });
    if (!deleted) return res.status(404).json({ error: "No encontrado" });
    res.json({ message: "Eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cambiar estado
export const actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: "Estado invalido" });
    }

    const ejerciente = await EjercienteModel.findByPk(id);
    if (!ejerciente) {
      return res.status(404).json({ error: "Ejerciente no encontrado" });
    }

    ejerciente.estado = estado;
    await ejerciente.save();

    res.json({ message: "Estado actualizado", data: sanitizeEjercienteResponse(ejerciente) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};