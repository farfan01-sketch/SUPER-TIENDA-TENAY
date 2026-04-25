import mongoose, { Schema, Model, Document } from "mongoose";

export interface ISaleItem {
  productId?: mongoose.Types.ObjectId;
  name: string;
  variantText?: string;
  variantId?: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  cost?: number;
  subtotal: number;
}

export interface ISalePayment {
  method: string;
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
  totalPaid?: number;
  change?: number;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  cashier?: string;
  shiftId?: mongoose.Types.ObjectId;
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
    variantId: { type: Schema.Types.ObjectId },
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
    folio: { type: String, required: true, unique: true },
    items: {
      type: [SaleItemSchema],
      default: [],
    },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    payments: { type: [SalePaymentSchema], default: [] },
    totalPaid: { type: Number, default: 0 },
    change: { type: Number, default: 0 },

    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String },

    cashier: { type: String },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
      index: true,
    },

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
  mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema);