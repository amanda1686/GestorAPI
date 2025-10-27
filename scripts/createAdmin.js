import "dotenv/config";
import db from "../database/db.js";
import EjercienteModel from "../Models/ejercientes.js";
import { hashPassword } from "../Utils/auth.js";

const DEFAULT_USER = process.env.ADMIN_USER ?? "admin";
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD ?? "AdminSeguro123!";
const DEFAULT_NUM_API = Number(process.env.ADMIN_NUM_API ?? 1);

async function run() {
  await db.connectDB();

  try {
    const existing = await EjercienteModel.findOne({ usuario: DEFAULT_USER });
    if (existing) {
      console.log(`Ya existe un usuario con usuario='${DEFAULT_USER}'. No se creo otro.`);
      return;
    }

    const doc = await EjercienteModel.create({
      usuario: DEFAULT_USER,
      contrasena: hashPassword(DEFAULT_PASSWORD),
      Num_api: Number.isFinite(DEFAULT_NUM_API) ? DEFAULT_NUM_API : undefined,
      Nombre: process.env.ADMIN_NOMBRE ?? "Administrador",
      Apellidos: process.env.ADMIN_APELLIDOS ?? "Principal",
      Nivel: 1,
      estado: "activo",
    });

    console.log("Admin creado correctamente.");
    console.log({
      IdEjerciente: doc.IdEjerciente,
      usuario: doc.usuario,
      Num_api: doc.Num_api,
      Nivel: doc.Nivel,
    });
    console.log("Credenciales:");
    console.log(`  usuario: ${DEFAULT_USER}`);
    console.log(`  contrasena: ${DEFAULT_PASSWORD}`);
  } finally {
    await db.closeDB();
  }
}

run().catch((err) => {
  console.error("Error creando admin:", err);
  process.exit(1);
});
