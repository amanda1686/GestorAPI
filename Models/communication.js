import { DataTypes } from "sequelize";
import db from "../database/db.js";

const Communication = db.define(
  "communications",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    sender_num_api: { type: DataTypes.STRING(50), allowNull: false },
    subject: { type: DataTypes.STRING(200), allowNull: false },
    body: { type: DataTypes.TEXT("medium"), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "communications",
    timestamps: false,
  }
);

const CommunicationRecipient = db.define(
  "communication_recipients",
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    communication_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    recipient_num_api: { type: DataTypes.STRING(50), allowNull: false },
    read_at: { type: DataTypes.DATE, allowNull: true },
    archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "communication_recipients",
    timestamps: false,
  }
);

Communication.hasMany(CommunicationRecipient, {
  as: "recipients",
  foreignKey: "communication_id",
  sourceKey: "id",
});

CommunicationRecipient.belongsTo(Communication, {
  as: "communication",
  foreignKey: "communication_id",
  targetKey: "id",
});

export { Communication, CommunicationRecipient };
