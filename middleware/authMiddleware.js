import EjercienteModel from "../Models/ejercientes.js";
import { verifyAccessToken, sanitizeUser } from "../Utils/auth.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers?.authorization ?? "";
    const [scheme, token] = authHeader.split(" ");
    if (!token || scheme?.toLowerCase() !== "bearer") {
      return res.status(401).json({ error: "Autenticacion requerida" });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded?.IdEjerciente) {
      return res.status(401).json({ error: "Token invalido" });
    }

    const ejerciente = await EjercienteModel.findByPk(decoded.IdEjerciente);
    if (!ejerciente) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    req.user = sanitizeUser(ejerciente);
    req.auth = decoded;
    return next();
  } catch (err) {
    console.error("[auth] Error autenticando:", err);
    const status = err.name === "TokenExpiredError" ? 401 : 401;
    return res.status(status).json({ error: err.message ?? "Token invalido" });
  }
}

export function requireNivel(requiredNivel = 1) {
  return (req, res, next) => {
    const nivel = Number(req.user?.Nivel ?? req.user?.nivel);
    if (!Number.isInteger(nivel)) {
      return res.status(403).json({ error: "Nivel del usuario no disponible" });
    }
    if (nivel !== requiredNivel) {
      return res.status(403).json({
        error: "No tienes permisos para realizar esta accion",
        requiredNivel,
      });
    }
    return next();
  };
}
