import TestigosModel from "../Models/testigos.js";
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

function sanitizeTestigos(testigos) {
  if (!testigos) return testigos;
  const data = { ...testigos };

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
