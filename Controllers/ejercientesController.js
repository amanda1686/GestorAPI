import EjercienteModel from "../Models/ejercientes.js";
import { hashPassword, validatePasswordStrength, verifyPassword } from "../Utils/auth.js";
const NIVEL_DEFAULT = 3;
const NIVELES_VALIDOS = new Set([1, 2, 3]);

function sanitizeEjercienteResponse(ejerciente) {
  if (!ejerciente) return ejerciente;
  const data = ejerciente.toJSON ? ejerciente.toJSON() : { ...ejerciente };
  delete data.contrasena;
  if (data.Nivel !== undefined && data.Nivel !== null) {
    const parsedNivel = Number(data.Nivel);
    if (!Number.isNaN(parsedNivel)) {
      data.Nivel = parsedNivel;
    }
  }
  return data;
}

function getRequesterNivel(req) {
  const candidates = [
    req.user?.Nivel,
    req.user?.nivel,
    req.auth?.Nivel,
    req.auth?.nivel,
    req.headers?.['x-user-nivel'],
    req.headers?.['x-nivel'],
    req.headers?.['x-admin-nivel'],
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed)) return parsed;
  }

  return null;
}

function parseNivel(value) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && NIVELES_VALIDOS.has(parsed)) {
    return parsed;
  }
  return null;
}

function normalizeNivelFromPayload(req, payload, { mode }) {
  const hasNivel = Object.prototype.hasOwnProperty.call(payload ?? {}, 'Nivel');
  const requesterNivel = getRequesterNivel(req);

  if (!hasNivel) {
    if (mode === 'create') {
      payload.Nivel = NIVEL_DEFAULT;
    }
    return;
  }

  if (requesterNivel === 1) {
    const requestedNivel = parseNivel(payload.Nivel);
    if (requestedNivel === null) {
      const error = new Error('Nivel invalido');
      error.statusCode = 400;
      error.details = {
        allowed: Array.from(NIVELES_VALIDOS),
      };
      throw error;
    }
    payload.Nivel = requestedNivel;
    return;
  }

  if (mode === 'create') {
    payload.Nivel = NIVEL_DEFAULT;
    return;
  }

  const error = new Error('No tienes permisos para modificar el nivel');
  error.statusCode = 403;
  error.details = { requiredNivel: 1 };
  throw error;
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
    const { contrasena, contrasenaActual } = req.body ?? {};
    if (!contrasena) {
      return res.status(400).json({ error: "La contrasena es obligatoria" });
    }

    const ejerciente = await EjercienteModel.findByPk(req.params.id);
    if (!ejerciente) {
      return res.status(404).json({ error: "No encontrado" });
    }

    if (contrasenaActual) {
      const matches = verifyPassword(contrasenaActual, ejerciente.contrasena);
      if (!matches) {
        return res.status(400).json({ error: "La contrasena actual no es correcta" });
      }
    }

    const passwordCheck = validatePasswordStrength(contrasena);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: "Contrasena invalida", details: passwordCheck.errors });
    }

    if (verifyPassword(contrasena, ejerciente.contrasena)) {
      return res.status(400).json({ error: "La nueva contrasena debe ser diferente a la anterior" });
    }

    ejerciente.contrasena = hashPassword(contrasena);
    await ejerciente.save();

    res.json({ message: "Contrasena actualizada" });
  } catch (err) {
    return handleSequelizeError(res, err);
  }
};

export const crearEjerciente = async (req, res) => {
  try {
    const payload = limpiarPayload(req.body);
    try {
      normalizeNivelFromPayload(req, payload, { mode: 'create' });
    } catch (customError) {
      if (customError?.statusCode) {
        return res.status(customError.statusCode).json({
          error: customError.message,
          ...(customError.details ?? {}),
        });
      }
      throw customError;
    }
    if (payload.estado) {
      payload.estado = String(payload.estado).trim().toLowerCase();
      if (!ESTADOS_VALIDOS.includes(payload.estado)) {
        return res.status(400).json({
          error: "Estado invalido",
          allowed: ESTADOS_VALIDOS,
        });
      }
    }
    if (!payload.contrasena) {
      return res.status(400).json({ error: "La contrasena es obligatoria" });
    }

    const passwordCheck = validatePasswordStrength(payload.contrasena);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: "Contrasena invalida", details: passwordCheck.errors });
    }

    payload.contrasena = hashPassword(payload.contrasena);

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
    const id = Number(req.params?.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalido" });
    }

    const ejerciente = await EjercienteModel.findByPk(id);
    if (!ejerciente) {
      return res.status(404).json({ error: "No encontrado" });
    }

    const isSelfUpdate = req.auth.IdEjerciente === id;
    const isAdmin = req.user.Nivel === 1;

    // Determinar qué campos puede actualizar según su rol
    let allowedFields;
    if (isAdmin) {
      allowedFields = [...CAMPOS_PERMITIDOS]; // Todos los campos permitidos
    } else if (isSelfUpdate) {
      // Los usuarios normales solo pueden actualizar sus datos personales básicos
      allowedFields = [
        "Nombre",
        "Apellidos",
        "telefono_1",
        "telefono_2",
        "Movil",
        "email",
        "url",
        "imagen",
        "Direccion",
        "cp",
        "Localidad",
        "Provincia"
      ];
    } else {
      return res.status(403).json({
        error: "No tienes permisos para actualizar este ejerciente"
      });
    }

    const payload = {};
    for (const campo of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, campo)) {
        payload[campo] = req.body[campo];
      }
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "No se recibieron campos para actualizar" });
    }

    if (isAdmin && Object.prototype.hasOwnProperty.call(payload, "Nivel")) {
      try {
        normalizeNivelFromPayload(req, payload, { mode: 'update' });
      } catch (customError) {
        if (customError?.statusCode) {
          return res.status(customError.statusCode).json({
            error: customError.message,
            ...(customError.details ?? {}),
          });
        }
        throw customError;
      }
    }

    if (payload.contrasena) {
      const passwordCheck = validatePasswordStrength(payload.contrasena);
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: "Contrasena invalida", details: passwordCheck.errors });
      }
      payload.contrasena = hashPassword(payload.contrasena);
    }

    await ejerciente.update(payload);
    res.json({ 
      message: "Actualizado", 
      data: sanitizeEjercienteResponse(ejerciente) 
    });
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

