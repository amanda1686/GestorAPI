import db from "../database/db.js";
import { getNextSequenceValue } from "../database/sequences.js";

const { mongoose } = db;
const { Schema, model } = mongoose;

const TasacionSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    Num_api: { type: Number, index: true },
    Tipo: { type: String, trim: true },
    cp: { type: String, trim: true },
    fecha: { type: Date },
    Sup_m2: { type: Number },
    Valor_total: { type: Number },
    Eur_m2: { type: Number },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    collection: "tasaciones",
    timestamps: false,
  }
);

TasacionSchema.pre("save", async function assignSequentialId(next) {
  if (this.id) {
    this.updated_at = new Date();
    return next();
  }
  try {
    const nextId = await getNextSequenceValue("tasaciones");
    this.id = nextId;
    this.updated_at = new Date();
    return next();
  } catch (error) {
    return next(error);
  }
});

TasacionSchema.statics.findAll = function findAll(options = {}) {
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

TasacionSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  obj._id = obj._id?.toString();
  return obj;
};

const TasacionesModel = model("Tasacion", TasacionSchema);

export default TasacionesModel;

export function validarTasacion(data = {}) {
  const errores = [];

  const cp = data.cp;
  if (cp && !/^\d{4,10}$/.test(String(cp))) {
    errores.push("cp debe contener solo digitos (4-10 caracteres)");
  }

  if (data.fecha) {
    const parsedDate = Date.parse(data.fecha);
    if (Number.isNaN(parsedDate)) {
      errores.push("fecha debe tener un formato valido (YYYY-MM-DD)");
    }
  }

  const decimalFields = [
    { key: "Sup_m2", mensaje: "Sup_m2 debe ser un numero" },
    { key: "Valor_total", mensaje: "Valor_total debe ser un numero" },
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
