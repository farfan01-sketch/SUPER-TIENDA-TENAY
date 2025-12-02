import mongoose, { Schema, Model, Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  creditLimit: number;
  currentBalance: number; // saldo pendiente actual
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    notes: { type: String },
    creditLimit: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
