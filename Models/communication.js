import db from "../database/db.js";
import { getNextSequenceValue } from "../database/sequences.js";

const { mongoose } = db;
const { Schema, model } = mongoose;

const CommunicationSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    sender_num_api: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: "communications",
    timestamps: false,
  }
);

CommunicationSchema.pre("save", async function assignSequentialId(next) {
  if (this.id) {
    return next();
  }
  try {
    const nextId = await getNextSequenceValue("communications");
    this.id = nextId;
    return next();
  } catch (error) {
    return next(error);
  }
});

CommunicationSchema.statics.findByPk = function findByPk(id, options = {}) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return Promise.resolve(null);
  }
  const query = this.findOne({ id: numericId });
  if (options.lean) {
    return query.lean();
  }
  return query;
};

CommunicationSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  obj._id = obj._id?.toString();
  return obj;
};

const CommunicationRecipientSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    communication_id: { type: Number, required: true, index: true },
    recipient_num_api: { type: String, required: true, trim: true },
    read_at: { type: Date },
    archived: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    collection: "communication_recipients",
    timestamps: false,
  }
);

CommunicationRecipientSchema.pre("save", async function assignSequentialId(next) {
  if (this.id) {
    this.updated_at = new Date();
    return next();
  }
  try {
    const nextId = await getNextSequenceValue("communication_recipients");
    this.id = nextId;
    this.updated_at = new Date();
    return next();
  } catch (error) {
    return next(error);
  }
});

CommunicationRecipientSchema.pre("updateOne", function updateTimestamp(next) {
  this.set({ updated_at: new Date() });
  next();
});

CommunicationRecipientSchema.statics.findByCommunication = function findByCommunication(communicationId) {
  const numericId = Number(communicationId);
  if (Number.isNaN(numericId)) {
    return Promise.resolve([]);
  }
  return this.find({ communication_id: numericId }).lean();
};

CommunicationRecipientSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  obj._id = obj._id?.toString();
  return obj;
};

const Communication = model("Communication", CommunicationSchema);
const CommunicationRecipient = model("CommunicationRecipient", CommunicationRecipientSchema);

export { Communication, CommunicationRecipient };
