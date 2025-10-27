import EjercienteModel from "../Models/ejercientes.js";
import { verifyAccessToken, sanitizeUser } from "../Utils/auth.js";

export async function authenticate(req, res, next) {
  try {
    if (req.method === 'OPTIONS') {
      return next();
    }
    const authHeader = req.headers?.authorization ?? "";
    const [scheme, token] = authHeader.split(" ");
    if (!token || scheme?.toLowerCase() !== "bearer") {
      return res.status(401).json({ error: "Autenticacion requerida" });
    }

    const decoded = verifyAccessToken(token);
    const authId = Number(decoded?.IdEjerciente ?? decoded?.id);
    if (!Number.isInteger(authId)) {
      return res.status(401).json({ error: "Token invalido" });
    }

    decoded.IdEjerciente = authId;

    const ejerciente = await EjercienteModel.findByPk(authId);
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

export function requireNivel(requiredNivel = 1, options = {}) {
  return (req, res, next) => {
    const nivel = Number(req.user?.Nivel ?? req.user?.nivel);
    if (!Number.isInteger(nivel)) {
      return res.status(403).json({ error: "Nivel del usuario no disponible" });
    }
    
    // Permitir actualización de datos propios
    const authId = Number(req.auth?.IdEjerciente ?? req.auth?.id);
    if (options.allowSelfUpdate && req.params.id && authId === Number(req.params.id)) {
      return next();
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
