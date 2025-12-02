import mongoose, { Schema, Model, Document } from "mongoose";

export interface ICustomerPayment extends Document {
  customerId: mongoose.Types.ObjectId;
  saleId?: mongoose.Types.ObjectId;
  amount: number;
  method: string; // Efectivo, Transferencia, Tarjeta, etc.
  note?: string;
  userId?: string;
  username?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerPaymentSchema = new Schema<ICustomerPayment>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    saleId: {
      type: Schema.Types.ObjectId,
      ref: "Sale",
    },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    note: { type: String },
    userId: { type: String },
    username: { type: String },
  },
  { timestamps: true }
);

export const CustomerPayment: Model<ICustomerPayment> =
  mongoose.models.CustomerPayment ||
  mongoose.model<ICustomerPayment>(
    "CustomerPayment",
    CustomerPaymentSchema
  );
