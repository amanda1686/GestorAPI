import TestigosModel, { validarTestigo } from "../Models/testigos.js";
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

function sanitizeTestigos(testigo) {
  if (!testigo) return testigo;
  const data = { ...testigo };

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
  console.error("TestigosController error:", error);
  const statusCode = error?.statusCode ?? 500;
  return res.status(statusCode).json({
    error: error?.message ?? "Error interno del servidor",
  });
}

export async function listarTestigos(_req, res) {
  try {
    const testigos = await TestigosModel.findAll({ raw: true, sort: { created_at: -1 } });

    const numApis = Array.from(
      new Set(
        testigos
          .map((testigo) => Number(testigo.Num_api))
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

    const items = testigos.map((testigo) => {
      const ejerciente = ejercienteMap.get(Number(testigo.Num_api));
      return sanitizeTestigos({
        ...testigo,
        ejerciente: ejerciente ? { ...ejerciente } : undefined,
      });
    });

    res.json(items);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

export async function crearTestigo(req, res) {
  try {
    const payload = { ...(req.body ?? {}) };
    const numApi = Number(payload.Num_api ?? payload.num_api);

    if (!Number.isInteger(numApi)) {
      return res.status(400).json({ error: "Num_api es obligatorio y debe ser numerico" });
    }

    payload.Num_api = numApi;
    const errores = validarTestigo(payload);
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
      Fecha: payload.Fecha ?? payload.fecha ?? undefined,
      Tipo: payload.Tipo ?? payload.tipo ?? undefined,
      CP: payload.CP ?? payload.cp ?? undefined,
      Dir: payload.Dir ?? payload.dir ?? undefined,
      zona: payload.zona ?? payload.Zona ?? undefined,
      Eur_m2: payload.Eur_m2 ?? payload.eur_m2 ?? undefined,
      Operacion: payload.Operacion ?? payload.operacion ?? undefined,
      Sup_m2: payload.Sup_m2 ?? payload.sup_m2 ?? undefined,
    };

    if (normalized.Fecha) {
      normalized.Fecha = new Date(normalized.Fecha);
    }

    ["Eur_m2", "Sup_m2"].forEach((field) => {
      const value = normalized[field];
      if (value !== undefined && value !== null && value !== "") {
        normalized[field] = Number(value);
      } else {
        delete normalized[field];
      }
    });

    ["Tipo", "CP", "Dir", "zona", "Operacion"].forEach((field) => {
      const value = normalized[field];
      if (value === undefined || value === null) {
        delete normalized[field];
      } else {
        const trimmed = String(value).trim();
        if (trimmed) {
          normalized[field] = trimmed;
        } else {
          delete normalized[field];
        }
      }
    });

    const testigo = await TestigosModel.create(normalized);

    return res
      .status(201)
      .json(
        sanitizeTestigos({
          ...(testigo.toJSON ? testigo.toJSON() : testigo),
          ejerciente,
        })
      );
  } catch (error) {
    return handleControllerError(res, error);
  }
}
