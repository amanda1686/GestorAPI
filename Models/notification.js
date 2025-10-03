import { DataTypes } from "sequelize";
import db from "../database/db.js";

const NOTIFICATION_KINDS = Object.freeze([
  "info",
  "success",
  "warning",
  "error",
  "announcement",
]);

const Notification = db.define(
  "notifications",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_num_api: { type: DataTypes.STRING(50), allowNull: false },
    title: { type: DataTypes.STRING(180), allowNull: false },
    message: { type: DataTypes.STRING(500), allowNull: false },
    kind: { type: DataTypes.ENUM(...NOTIFICATION_KINDS), allowNull: false, defaultValue: "info" },
    link: { type: DataTypes.STRING(300), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    read_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "notifications",
    timestamps: false,
  }
);

export { Notification, NOTIFICATION_KINDS };
