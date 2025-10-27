import { connectDB, getConnection } from "./db.js";

export async function getNextSequenceValue(sequenceName) {
  if (!sequenceName) {
    throw new Error("sequenceName es requerido");
  }

  await connectDB();
  const connection = getConnection();
  const counters = connection.collection("counters");

  const result = await counters.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  const doc = result.value ?? (await counters.findOne({ _id: sequenceName }));

  if (!doc || typeof doc.seq !== "number") {
    throw new Error(`No se pudo generar la secuencia para ${sequenceName}`);
  }

  return doc.seq;
}
