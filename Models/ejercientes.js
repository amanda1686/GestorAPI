import db from "../database/db.js";
import { getNextSequenceValue } from "../database/sequences.js";

const { mongoose } = db;
const { Schema, model } = mongoose;

const NIVELES_PERMITIDOS = new Set([1, 2, 3]);
const ESTADOS_VALIDOS = ["activo", "pendiente", "inactivo"];
const ID_COAPI_ENUM = ["Colegiado", "Asociado", "Invitado"];

const EjercienteSchema = new Schema(
  {
    IdEjerciente: { type: Number, unique: true, index: true },
    Num_api: { type: Number, sparse: true, index: true },
    Nombre: { type: String, trim: true },
    Apellidos: { type: String, trim: true },
    Nombre_Comercial: { type: String, trim: true },
    Direccion: { type: String, trim: true },
    cp: { type: Number },
    Localidad: { type: String, trim: true },
    Provincia: { type: String, trim: true },
    telefono_1: { type: Number },
    telefono_2: { type: Number },
    fax: { type: String, trim: true },
    Movil: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    url: { type: String, trim: true },
    imagen: { type: String, trim: true },
    usuario: { type: String, required: true, unique: true, trim: true },
    contrasena: { type: String, required: true },
    Colegio: { type: String, trim: true },
    apilocal: { type: String, trim: true },
    web: { type: String, trim: true },
    tasapi: { type: Schema.Types.Mixed },
    visados: { type: String, trim: true },
    IdCoapi: { type: String, enum: ID_COAPI_ENUM, default: "Colegiado" },
    Nivel: { type: Number, default: 3, enum: Array.from(NIVELES_PERMITIDOS) },
    imgcom: { type: String, trim: true },
    estado: { type: String, enum: ESTADOS_VALIDOS, default: "pendiente" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "ejercientes",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

EjercienteSchema.pre("save", async function assignSequentialId(next) {
  if (this.IdEjerciente) {
    return next();
  }

  try {
    const nextId = await getNextSequenceValue("ejercientes");
    this.IdEjerciente = nextId;
    return next();
  } catch (error) {
    return next(error);
  }
});

EjercienteSchema.statics.findByPk = function findByPk(id) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return Promise.resolve(null);
  }
  return this.findOne({ IdEjerciente: numericId });
};

EjercienteSchema.statics.destroyByPk = function destroyByPk(id) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return Promise.resolve({ deletedCount: 0 });
  }
  return this.deleteOne({ IdEjerciente: numericId });
};

EjercienteSchema.statics.findAll = function findAll(options = {}) {
  const {
    where = {},
    attributes,
    limit,
    offset,
    order,
    raw = false,
  } = options ?? {};

  let query = this.find(where);

  if (Array.isArray(attributes) && attributes.length > 0) {
    const projection = {};
    for (const attr of attributes) {
      projection[attr] = 1;
    }
    query = query.select(projection);
  }

  if (Number.isInteger(limit)) {
    query = query.limit(limit);
  }

  if (Number.isInteger(offset)) {
    query = query.skip(offset);
  }

  if (Array.isArray(order) && order.length > 0) {
    const sortSpec = {};
    for (const item of order) {
      if (Array.isArray(item) && item.length >= 1) {
        const [field, direction] = item;
        sortSpec[field] = String(direction ?? "asc").toLowerCase() === "desc" ? -1 : 1;
      } else if (typeof item === "string") {
        sortSpec[item] = 1;
      }
    }
    query = query.sort(sortSpec);
  }

  if (raw) {
    query = query.lean();
  }

  return query.exec();
};

EjercienteSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = obj.IdEjerciente ?? obj._id?.toString();
  delete obj._id;
  return obj;
};

const EjercienteModel = model("Ejerciente", EjercienteSchema);

export default EjercienteModel;

export function validarEjerciente(data) {
  const errores = [];
  if (isNaN(Number(data.Num_api))) errores.push("Num_api debe ser un numero");
  if (isNaN(Number(data.cp))) errores.push("cp debe ser un numero");
  if (isNaN(Number(data.telefono_1))) errores.push("telefono_1 debe ser un numero");
  if (isNaN(Number(data.telefono_2))) errores.push("telefono_2 debe ser un numero");
  if (data.Nivel !== undefined && data.Nivel !== null) {
    const nivelNumero = Number(data.Nivel);
    if (Number.isNaN(nivelNumero)) {
      errores.push("Nivel debe ser un numero");
    } else if (!NIVELES_PERMITIDOS.has(nivelNumero)) {
      errores.push("Nivel debe ser 1, 2 o 3");
    }
  }
  return errores;
}
