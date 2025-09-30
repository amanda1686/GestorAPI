import TestigosModel from "../Models/testigos.js";
import EjercienteModel from "../Models/ejercientes.js";

function sanitizeTestigos(testigos) {
  if (!testigos) return testigos;
  const data = testigos.toJSON ? testigos.toJSON() : { ...testigos };

  if (data.Num_api) {
    data.detalleUrl = `/ejercientes/${encodeURIComponent(data.Num_api)}`;
  }

  if (data.ejerciente) {
    const ejerciente = { ...data.ejerciente };
    if (ejerciente.contrasena !== undefined) {
      delete ejerciente.contrasena;
    }
    data.ejerciente = ejerciente;
  }

  return data;
}

function handleSequelizeError(res, error) {
  console.error("TestigosController error:", error);
  const statusCode = error?.statusCode ?? 500;
  const payload = {
    error: error?.message ?? "Error interno del servidor",
  };
  if (error?.errors && Array.isArray(error.errors)) {
    payload.details = error.errors.map((err) => ({
      message: err.message,
      field: err.path,
    }));
  }
  return res.status(statusCode).json(payload);
}

export async function listarTestigos(_req, res) {
  try {
    const testigos = await TestigosModel.findAll({
      include: [
        {
          model: EjercienteModel,
          as: "ejerciente",
          attributes: [
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
          ],
        },
      ],
    });
    res.json(testigos.map(sanitizeTestigos));
  } catch (error) {
    return handleSequelizeError(res, error);
  }
}
