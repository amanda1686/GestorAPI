import { randomBytes, pbkdf2Sync } from "crypto";
import EjercienteModel from "../Models/ejercientes.js";

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32; // bytes -> 256-bit hash
const PBKDF2_SALT_SIZE = 16; // bytes

function hashPassword(contrasena) {
  if (!contrasena) return contrasena;
  const salt = randomBytes(PBKDF2_SALT_SIZE).toString("hex");
  const hash = pbkdf2Sync(contrasena, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function sanitizeEjercienteResponse(ejerciente) {
  if (!ejerciente) return ejerciente;
  const data = ejerciente.toJSON ? ejerciente.toJSON() : { ...ejerciente };
  delete data.contrasena;
  return data;
}

function handleSequelizeError(res, err) {
  if (err?.name === "SequelizeValidationError" || err?.name === "SequelizeUniqueConstraintError") {
    const details = (err.errors ?? []).map(({ message, path, value, validatorKey, validatorName, type }) => ({
      message,
      path,
      value,
      validatorKey,
      validatorName,
      type,
    }));
    const messages = details.length > 0 ? details.map((item) => item.message) : [err.message].filter(Boolean);
    return res.status(400).json({
      error: "Validation error",
      messages,
      details,
    });
  }

  console.error("[ejercientes] Error inesperado:", err);
  const sqlMessage = err?.parent?.sqlMessage ?? err?.original?.sqlMessage;
  const details = err?.errors
    ? err.errors.map(({ message, path, value, validatorKey, validatorName, type }) => ({
        message,
        path,
        value,
        validatorKey,
        validatorName,
        type,
      }))
    : undefined;

  return res.status(500).json({
    error: err.message,
    ...(sqlMessage ? { sqlMessage } : {}),
    ...(details ? { details } : {}),
  });
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
    return handleSequelizeError(res, err);
  }
};

export const crearEjerciente = async (req, res) => {
  try {
    const payload = limpiarPayload(req.body);
    if (payload.estado) {
      payload.estado = String(payload.estado).trim().toLowerCase();
      if (!ESTADOS_VALIDOS.includes(payload.estado)) {
        return res.status(400).json({
          error: "Estado invalido",
          allowed: ESTADOS_VALIDOS,
        });
      }
    }
    if (payload.contrasena) {
      payload.contrasena = hashPassword(payload.contrasena);
    }

    const nuevo = await EjercienteModel.create(payload);

    res.status(201).json({ data: sanitizeEjercienteResponse(nuevo) });
  } catch (err) {
    return handleSequelizeError(res, err);
  }
};

export const listarEjercientes = async (_req, res) => {
  try {
    const ejercientes = await EjercienteModel.findAll();
    res.json(ejercientes.map(sanitizeEjercienteResponse));
  } catch (err) {
    return handleSequelizeError(res, err);
  }
};

export const obtenerEjerciente = async (req, res) => {
  try {
    const ejerciente = await EjercienteModel.findByPk(req.params.id);
    if (!ejerciente) return res.status(404).json({ error: "No encontrado" });
    res.json(sanitizeEjercienteResponse(ejerciente));
  } catch (err) {
    return handleSequelizeError(res, err);
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
    return handleSequelizeError(res, err);
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
    return handleSequelizeError(res, err);
  }
};

// Cambiar estado
export const actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const normalizedEstado = String(estado ?? "").trim().toLowerCase();
    if (!ESTADOS_VALIDOS.includes(normalizedEstado)) {
      return res.status(400).json({ error: "Estado invalido" });
    }

    const ejerciente = await EjercienteModel.findByPk(id);
    if (!ejerciente) {
      return res.status(404).json({ error: "Ejerciente no encontrado" });
    }

    ejerciente.estado = normalizedEstado;
    await ejerciente.save();

    res.json({ message: "Estado actualizado", data: sanitizeEjercienteResponse(ejerciente) });
  } catch (err) {
    return handleSequelizeError(res, err);
  }
};

