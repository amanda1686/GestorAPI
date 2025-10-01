import EjercienteModel from "../Models/ejercientes.js";
import { verifyPassword, createAccessToken, sanitizeUser } from "../Utils/auth.js";

export async function login(req, res) {
  try {
    const { usuario, contrasena } = req.body ?? {};

    if (!usuario || !contrasena) {
      return res.status(400).json({ error: "usuario y contrasena son obligatorios" });
    }

    const ejerciente = await EjercienteModel.findOne({ where: { usuario } });
    if (!ejerciente) {
      return res.status(401).json({ error: "Credenciales invalidas" });
    }

    const isValid = verifyPassword(contrasena, ejerciente.contrasena);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciales invalidas" });
    }

    const token = createAccessToken({
      IdEjerciente: ejerciente.IdEjerciente,
      Nivel: ejerciente.Nivel,
      usuario: ejerciente.usuario,
    });

    return res.json({
      token,
      user: sanitizeUser(ejerciente),
    });
  } catch (err) {
    console.error("[auth] error en login:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
