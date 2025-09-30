import db from "../database/db.js";
import { DataTypes } from "sequelize";
import EjercienteModel from "./ejercientes.js";

const TasacionesModel = db.define(
  "tasaciones",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    Num_api: { type: DataTypes.STRING(50), allowNull: true },
    Tipo: { type: DataTypes.STRING(50), allowNull: true },
    cp: { type: DataTypes.STRING(10), allowNull: true },
    fecha: { type: DataTypes.DATEONLY, allowNull: true },
    Sup_m2: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    Valor_total: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    Eur_m2: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  },
  { timestamps: false }
);

TasacionesModel.belongsTo(EjercienteModel, {
  foreignKey: "Num_api",
  targetKey: "Num_api",
  as: "ejerciente",
});

EjercienteModel.hasMany(TasacionesModel, {
  foreignKey: "Num_api",
  sourceKey: "Num_api",
  as: "tasaciones",
});

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
