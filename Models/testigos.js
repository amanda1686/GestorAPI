import db from "../database/db.js";
import { DataTypes } from "sequelize";
import EjercienteModel from "./ejercientes.js";

const TestigosModel = db.define(
  "testigos",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    Num_api: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    Fecha: { type: DataTypes.DATEONLY, allowNull: true },
    Tipo: { type: DataTypes.STRING(50), allowNull: true },
    CP: { type: DataTypes.STRING(10), allowNull: true },
    Dir: { type: DataTypes.STRING(255), allowNull: true },
    zona: { type: DataTypes.STRING(100), allowNull: true },
    Eur_m2: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    Operacion: { type: DataTypes.STRING(30), allowNull: true },
  },
  { timestamps: false }
);

TestigosModel.belongsTo(EjercienteModel, {
  foreignKey: "Num_api",
  targetKey: "Num_api",
  as: "ejerciente",
});

EjercienteModel.hasMany(TestigosModel, {
  foreignKey: "Num_api",
  sourceKey: "Num_api",
  as: "testigos",
});

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
