import db from "../database/db.js";
import { getNextSequenceValue } from "../database/sequences.js";

const { mongoose } = db;
const { Schema, model } = mongoose;

const TestigoSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    Num_api: { type: Number, required: true, index: true },
    Fecha: { type: Date },
    Tipo: { type: String, trim: true },
    CP: { type: String, trim: true },
    Dir: { type: String, trim: true },
    zona: { type: String, trim: true },
    Eur_m2: { type: Number },
    Operacion: { type: String, trim: true },
    Sup_m2: { type: Number },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    collection: "testigos",
    timestamps: false,
  }
);

TestigoSchema.pre("save", async function assignSequentialId(next) {
  if (this.id) {
    this.updated_at = new Date();
    return next();
  }
  try {
    const nextId = await getNextSequenceValue("testigos");
    this.id = nextId;
    this.updated_at = new Date();
    return next();
  } catch (error) {
    return next(error);
  }
});

TestigoSchema.statics.findAll = function findAll(options = {}) {
  const { where = {}, raw = false, sort = { created_at: -1 } } = options ?? {};
  let query = this.find(where);
  if (sort) {
    query = query.sort(sort);
  }
  if (raw) {
    query = query.lean();
  }
  return query.exec();
};

TestigoSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  obj._id = obj._id?.toString();
  return obj;
};

const TestigosModel = model("Testigo", TestigoSchema);

export default TestigosModel;

export function validarTestigo(data = {}) {
  const errores = [];

  const cp = data.CP ?? data.cp;
  if (cp && !/^\d{4,10}$/.test(String(cp))) {
    errores.push("CP debe contener solo digitos (4-10 caracteres)");
  }

  const fecha = data.Fecha ?? data.fecha;
  if (fecha) {
    const parsedDate = Date.parse(fecha);
    if (Number.isNaN(parsedDate)) {
      errores.push("Fecha debe tener un formato valido (YYYY-MM-DD)");
    }
  }

  const decimalFields = [
    { key: "Sup_m2", mensaje: "Sup_m2 debe ser un numero" },
    { key: "Eur_m2", mensaje: "Eur_m2 debe ser un numero" },
  ];

  decimalFields.forEach(({ key, mensaje }) => {
    const valor = data[key];
    if (valor !== undefined && valor !== null && valor !== "") {
      if (Number.isNaN(Number(valor))) {
        errores.push(mensaje);
      }
    }
  });

  return errores;
}
