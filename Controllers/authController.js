import EjercienteModel from "../Models/ejercientes.js";
import { verifyPassword, createAccessToken, sanitizeUser } from "../Utils/auth.js";

export async function login(req, res) {
  try {
    const { usuario, contrasena } = req.body ?? {};

    if (!usuario || !contrasena) {
      return res.status(400).json({ error: "usuario y contrasena son obligatorios" });
    }

    const ejerciente = await EjercienteModel.findOne({ usuario });
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

export async function getProfile(req, res) {
  try {
    const ejerciente = await EjercienteModel.findByPk(req.auth.IdEjerciente);
    if (!ejerciente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    return res.json({ user: sanitizeUser(ejerciente) });
  } catch (err) {
    console.error("[auth] error obteniendo perfil:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}

export async function updateProfile(req, res) {
  try {
    const ejerciente = await EjercienteModel.findByPk(req.auth.IdEjerciente);
    if (!ejerciente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const allowed = ["Nombre", "Apellidos", "email", "telefono_1", "telefono_2", "imagen"];
    let dirty = false;
    for (const campo of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, campo)) {
        ejerciente[campo] = req.body[campo];
        dirty = true;
      }
    }

    if (!dirty) {
      return res.status(400).json({ error: "No se recibieron campos para actualizar" });
    }

    ejerciente.updatedAt = new Date();
    await ejerciente.save();
    return res.json({ user: sanitizeUser(ejerciente) });
  } catch (err) {
    console.error("[auth] error actualizando perfil:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
