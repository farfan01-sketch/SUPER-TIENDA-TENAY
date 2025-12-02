import mongoose, { Schema, Model, Document } from "mongoose";

export interface ISaleItem {
  productId?: mongoose.Types.ObjectId;
  name: string;
  variantText?: string;
  quantity: number;
  price: number;
  cost?: number;
  subtotal: number;
}

export interface ISalePayment {
  method: string; // Efectivo, Tarjeta, Crédito, etc.
  amount: number;
}

export type SaleStatus = "completed" | "cancelled";

export interface ISale extends Document {
  folio: string;
  items: ISaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payments: ISalePayment[];

  // Crédito
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;

  // Caja / control
  cashier?: string;
  status: SaleStatus;
  cancelReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    variantText: { type: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    cost: { type: Number },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const SalePaymentSchema = new Schema<ISalePayment>(
  {
    method: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    folio: {
      type: String,
      required: true,
      unique: true,
    },
    items: {
      type: [SaleItemSchema],
      default: [],
      validate: {
        validator: (v: ISaleItem[]) => v.length > 0,
        message: "La venta debe tener al menos un producto",
      },
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    payments: {
      type: [SalePaymentSchema],
      default: [],
    },

    // Cliente (crédito)
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerName: { type: String },

    // Control
    cashier: { type: String },
    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed",
    },
    cancelReason: { type: String },
  },
  { timestamps: true }
);

export const Sale: Model<ISale> =
  mongoose.models.Sale ||
  mongoose.model<ISale>("Sale", SaleSchema);
