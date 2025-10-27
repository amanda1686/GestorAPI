import "dotenv/config";
import { randomBytes, pbkdf2Sync } from "crypto";
import db from "../database/db.js";
import EjercienteModel from "../Models/ejercientes.js";

const ITER = 100000;
const KEY_LEN = 32;
const DIGEST = "sha512";
const SALT_SIZE = 16;

const hashPassword = (plain) => {
  const base = String(plain ?? "").trim();
  if (!base) throw new Error("Valor de contrasena invalido");
  const salt = randomBytes(SALT_SIZE).toString("hex");
  const hash = pbkdf2Sync(base, salt, ITER, KEY_LEN, DIGEST).toString("hex");
  return `${salt}:${hash}`;
};

const main = async () => {
  await db.connectDB();

  const candidates = await EjercienteModel.find({
    Num_api: { $ne: null },
    $or: [{ contrasena: null }, { contrasena: "" }, { contrasena: { $exists: false } }],
  });

  if (candidates.length === 0) {
    console.log("No hay contrasenas pendientes de actualizar.");
    await db.closeDB();
    return;
  }

  for (const ejerciente of candidates) {
    const plain = String(ejerciente.Num_api ?? "").trim();
    if (!plain) {
      console.warn(`Se omite IdEjerciente ${ejerciente.IdEjerciente}: Num_api vacio.`);
      continue;
    }
    ejerciente.contrasena = hashPassword(plain);
    ejerciente.updatedAt = new Date();
    await ejerciente.save();
  }

  await db.closeDB();
  console.log("Contrasenas actualizadas.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
