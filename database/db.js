import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI ?? "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB ?? "gestor";
const maxPoolSize = Number(process.env.MONGO_MAX_POOL ?? 10);

export async function connectDB() {
  const { readyState } = mongoose.connection;
  if (readyState === 1 || readyState === 2) {
    return mongoose.connection;
  }

  mongoose.set("strictQuery", false);

  await mongoose.connect(uri, {
    dbName,
    maxPoolSize,
    serverSelectionTimeoutMS: 10_000,
  });

  console.log(`[db] Conexion a MongoDB establecida: ${dbName}`);
  return mongoose.connection;
}

export function getConnection() {
  if (mongoose.connection.readyState === 0) {
    throw new Error("MongoDB no esta conectado. Llama a connectDB() primero.");
  }
  return mongoose.connection;
}

export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log("[db] Conexion a MongoDB cerrada");
  }
}

export default {
  connectDB,
  getConnection,
  closeDB,
  get mongoose() {
    return mongoose;
  },
  async authenticate() {
    await connectDB();
  },
  define() {
    throw new Error("db.define no esta disponible con Mongoose. Refactoriza los modelos para usar esquemas de Mongoose.");
  },
};
