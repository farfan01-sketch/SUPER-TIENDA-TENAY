import mongoose, { Schema, Model, Document } from "mongoose";

export interface IConfig extends Document {
  singletonKey: string; // siempre "main"
  storeName: string;
  address?: string;
  phone?: string;
  taxId?: string; // RFC u otro
  logoPath?: string; // ej: "/uploads/logo.png"
  ticketFooter?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConfigSchema = new Schema<IConfig>(
  {
    singletonKey: {
      type: String,
      required: true,
      unique: true,
      default: "main",
    },
    storeName: { type: String, required: true, default: "Super Tienda Tenay" },
    address: { type: String },
    phone: { type: String },
    taxId: { type: String },
    logoPath: { type: String, default: "/uploads/logo.png" },
    ticketFooter: {
      type: String,
      default: "Gracias por su compra.",
    },
  },
  { timestamps: true }
);

export const Config: Model<IConfig> =
  mongoose.models.Config || mongoose.model<IConfig>("Config", ConfigSchema);
