import { randomBytes, pbkdf2Sync, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_SALT_SIZE = 16;
const PBKDF2_DIGEST = "sha512";
const PASSWORD_REQUIRED_LENGTH = 6;

export function hashPassword(plain) {
  const toHash = String(plain ?? "").trim();
  if (!toHash) {
    throw new Error("Password cannot be empty");
  }
  const salt = randomBytes(PBKDF2_SALT_SIZE).toString("hex");
  const hash = pbkdf2Sync(toHash, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain, stored) {
  const candidate = String(plain ?? "").trim();
  if (!candidate || !stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = pbkdf2Sync(candidate, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
  } catch {
    return hash === computed;
  }
}

export function validatePasswordStrength(password) {
  const value = String(password ?? "").trim();
  const errors = [];
  if (!/^\d+$/.test(value)) {
    errors.push("Debe contener solo digitos");
  }
  if (value.length !== PASSWORD_REQUIRED_LENGTH) {
    errors.push(`Debe tener exactamente ${PASSWORD_REQUIRED_LENGTH} digitos`);
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createAccessToken(payload, options = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no esta configurado");
  }
  const expiresIn = options.expiresIn ?? process.env.JWT_EXPIRATION ?? "1h";
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyAccessToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no esta configurado");
  }
  return jwt.verify(token, secret);
}

export function sanitizeUser(ejerciente) {
  if (!ejerciente) return ejerciente;
  const data = ejerciente.toJSON ? ejerciente.toJSON() : { ...ejerciente };
  delete data.contrasena;
  return data;
}
