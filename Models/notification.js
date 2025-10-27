import db from "../database/db.js";
import { getNextSequenceValue } from "../database/sequences.js";

const NOTIFICATION_KINDS = Object.freeze([
  "info",
  "success",
  "warning",
  "error",
  "announcement",
]);

const { mongoose } = db;
const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    user_num_api: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    kind: { type: String, enum: NOTIFICATION_KINDS, default: "info" },
    link: { type: String, trim: true },
    created_at: { type: Date, default: Date.now },
    read_at: { type: Date },
  },
  {
    collection: "notifications",
    timestamps: false,
  }
);

NotificationSchema.pre("save", async function assignSequentialId(next) {
  if (this.id) {
    return next();
  }

  try {
    const nextId = await getNextSequenceValue("notifications");
    this.id = nextId;
    return next();
  } catch (error) {
    return next(error);
  }
});

NotificationSchema.statics.findByPk = function findByPk(id) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return Promise.resolve(null);
  }
  return this.findOne({ id: numericId });
};

NotificationSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  obj._id = obj._id?.toString();
  return obj;
};

const Notification = model("Notification", NotificationSchema);

export { Notification, NOTIFICATION_KINDS };
