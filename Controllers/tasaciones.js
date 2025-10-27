import TasacionesModel from "../Models/tasaciones.js";
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
