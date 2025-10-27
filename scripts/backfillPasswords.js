import "dotenv/config";
import { randomBytes, pbkdf2Sync } from "crypto";
import db from "../database/db.js";
import EjercienteModel from "../Models/ejercientes.js";

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_SALT_SIZE = 16;
const PBKDF2_DIGEST = "sha512";

function hashPassword(plain) {
  const base = String(plain ?? "").trim();
  if (!base) {
    throw new Error("Password value is empty or invalid");
  }
  const salt = randomBytes(PBKDF2_SALT_SIZE).toString("hex");
  const hash = pbkdf2Sync(base, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  await db.connectDB();

  const candidates = await EjercienteModel.find({
    $or: [{ contrasena: null }, { contrasena: "" }, { contrasena: { $exists: false } }],
  });

  if (candidates.length === 0) {
    console.log("No pending passwords to update.");
    await db.closeDB();
    return;
  }

  for (const ejerciente of candidates) {
    const base = ejerciente.Num_api !== null && ejerciente.Num_api !== undefined ? String(ejerciente.Num_api).trim() : "";

    if (!base) {
      console.warn(`Skipping IdEjerciente ${ejerciente.IdEjerciente}: Num_api empty, set manually.`);
      continue;
    }

    ejerciente.contrasena = hashPassword(base);
    ejerciente.updatedAt = new Date();
    await ejerciente.save();
    console.log(`Updated password for IdEjerciente ${ejerciente.IdEjerciente}`);
  }

  await db.closeDB();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Password backfill error:", err);
  process.exit(1);
});
