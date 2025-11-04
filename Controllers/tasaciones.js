import TasacionesModel, { validarTasacion } from "../Models/tasaciones.js";
import EjercienteModel from "../Models/ejercientes.js";

const EJERCIENTE_ATTRIBUTES = [
  "IdEjerciente",
  "Num_api",
  "Nombre",
  "Apellidos",
  "Nombre_Comercial",
  "Localidad",
  "Provincia",
  "email",
  "telefono_1",
  "telefono_2",
  "estado",
];

function sanitizeTasacion(tasacion) {
  if (!tasacion) return tasacion;
  const data = { ...tasacion };

  if (data.Num_api !== undefined && data.Num_api !== null) {
    data.detalleUrl = `/ejercientes/${encodeURIComponent(data.Num_api)}`;
  }

  if (data.ejerciente) {
    const ejerciente = { ...data.ejerciente };
    delete ejerciente.contrasena;
    data.ejerciente = ejerciente;
  }

  return data;
}

function handleControllerError(res, error) {
  console.error("TasacionesController error:", error);
  const statusCode = error?.statusCode ?? 500;
  return res.status(statusCode).json({
    error: error?.message ?? "Error interno del servidor",
  });
}

export async function listarTasaciones(_req, res) {
  try {
    const tasaciones = await TasacionesModel.findAll({ raw: true, sort: { created_at: -1 } });

    const numApis = Array.from(
      new Set(
        tasaciones
          .map((tasacion) => Number(tasacion.Num_api))
          .filter((value) => Number.isFinite(value))
      )
    );

    const ejercientes = numApis.length
      ? await EjercienteModel.find({ Num_api: { $in: numApis } })
          .select(EJERCIENTE_ATTRIBUTES.join(" "))
          .lean()
      : [];

    const ejercienteMap = new Map(
      ejercientes.map((ejerciente) => [Number(ejerciente.Num_api), ejerciente])
    );

    const items = tasaciones.map((tasacion) => {
      const ejerciente = ejercienteMap.get(Number(tasacion.Num_api));
      return sanitizeTasacion({
        ...tasacion,
        ejerciente: ejerciente ? { ...ejerciente } : undefined,
      });
    });

    res.json(items);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function crearTasacion(req, res) {
  try {
    const payload = { ...(req.body ?? {}) };
    const numApi = Number(payload.Num_api ?? payload.num_api);

    if (!Number.isInteger(numApi)) {
      return res.status(400).json({ error: "Num_api es obligatorio y debe ser numerico" });
    }

    payload.Num_api = numApi;
    payload.Tipo = payload.Tipo ?? payload.tipo;
    payload.cp = payload.cp ?? payload.CP;
    payload.fecha = payload.fecha ?? payload.Fecha;
    payload.Sup_m2 = payload.Sup_m2 ?? payload.sup_m2;
    payload.Valor_total = payload.Valor_total ?? payload.valor_total;
    payload.Eur_m2 = payload.Eur_m2 ?? payload.eur_m2;
    const errores = validarTasacion(payload);
    if (errores.length > 0) {
      return res.status(400).json({ error: "Datos invalidos", detalles: errores });
    }

    const ejerciente = await EjercienteModel.findOne({ Num_api: numApi })
      .select(EJERCIENTE_ATTRIBUTES.join(" "))
      .lean();

    if (!ejerciente) {
      return res.status(404).json({ error: "Ejerciente no encontrado" });
    }

    const normalized = {
      Num_api: numApi,
      Tipo: payload.Tipo,
      cp: payload.cp,
      fecha: payload.fecha,
      Sup_m2: payload.Sup_m2,
      Valor_total: payload.Valor_total,
      Eur_m2: payload.Eur_m2,
    };

    if (normalized.fecha) {
      normalized.fecha = new Date(normalized.fecha);
    }

    ["Tipo", "cp"].forEach((field) => {
      const value = normalized[field];
      if (value === undefined || value === null) {
        delete normalized[field];
      } else {
        const trimmed = String(value).trim();
        if (trimmed) {
          if (field === "Tipo") {
            normalized[field] = trimmed;
          } else if (field === "cp") {
            normalized[field] = trimmed;
          }
        } else {
          delete normalized[field];
        }
      }
    });

    if (normalized.cp && !/^\d+$/.test(normalized.cp)) {
      return res.status(400).json({ error: "cp debe contener solo digitos" });
    }

    ["Sup_m2", "Valor_total", "Eur_m2"].forEach((field) => {
      const value = normalized[field];
      if (value !== undefined && value !== null && value !== "") {
        normalized[field] = Number(value);
      } else {
        delete normalized[field];
      }
    });

    if (!normalized.cp) {
      delete normalized.cp;
    }

    const tasacion = await TasacionesModel.create(normalized);

    return res
      .status(201)
      .json(
        sanitizeTasacion({
          ...(tasacion.toJSON ? tasacion.toJSON() : tasacion),
          ejerciente,
        })
      );
  } catch (error) {
    return handleControllerError(res, error);
  }
}
