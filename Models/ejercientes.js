import db from "../database/db.js";
import { DataTypes } from "sequelize";

const EjercienteModel = db.define(
  "ejercientes",
  {
    IdEjerciente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Num_api: { type: DataTypes.INTEGER, allowNull: true },
    Nombre: { type: DataTypes.STRING, allowNull: true },
    Apellidos: { type: DataTypes.STRING, allowNull: true },
    Nombre_Comercial: { type: DataTypes.STRING, allowNull: true },
    Direccion: { type: DataTypes.STRING, allowNull: true },
    cp: { type: DataTypes.INTEGER, allowNull: true },
    Localidad: { type: DataTypes.STRING, allowNull: true },
    Provincia: { type: DataTypes.STRING, allowNull: true },
    telefono_1: { type: DataTypes.INTEGER, allowNull: true },
    telefono_2: { type: DataTypes.INTEGER, allowNull: true },
    fax: { type: DataTypes.STRING, allowNull: true },
    Movil: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    url: { type: DataTypes.STRING, allowNull: true },
    imagen: { type: DataTypes.STRING, allowNull: true },
    usuario: { type: DataTypes.STRING, allowNull: true },
    contrasena: { type: DataTypes.STRING, allowNull: true },
    Colegio: { type: DataTypes.STRING, allowNull: true },
    apilocal: { type: DataTypes.STRING, allowNull: true },
    web: { type: DataTypes.STRING, allowNull: true },
    tasapi: { type: DataTypes.JSON, allowNull: true },
    visados: { type: DataTypes.STRING, allowNull: true },
    IdCoapi: { type: DataTypes.STRING, allowNull: true },
    Nivel: { type: DataTypes.INTEGER, allowNull: true },
    imgcom: { type: DataTypes.STRING, allowNull: true },
    estado: {type: DataTypes.ENUM('activo', 'pendiente', 'inactivo'),allowNull: false,defaultValue: 'pendiente'}
  },
  { timestamps: false }
);

export default EjercienteModel;

// Valida que los campos numéricos sean números
export function validarEjerciente(data) {
	const errores = [];
	if (isNaN(Number(data.Num_api))) errores.push('Num_api debe ser un número');
	if (isNaN(Number(data.cp))) errores.push('cp debe ser un número');
	if (isNaN(Number(data.telefono_1))) errores.push('telefono_1 debe ser un número');
	if (isNaN(Number(data.telefono_2))) errores.push('telefono_2 debe ser un número');
	if (isNaN(Number(data.Nivel))) errores.push('Nivel debe ser un número');
	return errores;
}
