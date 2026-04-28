import mongoose, { Schema, Model, Document } from "mongoose";

export interface ISaleReturnItem {
  productId?: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId;
  name: string;
  variantText?: string;
  quantity: number;
  price: number;
  cost?: number;
  subtotal: number;
}

export interface ISaleReturn extends Document {
  saleId: mongoose.Types.ObjectId;
  saleFolio?: string;
  items: ISaleReturnItem[];
  totalReturned: number;
  reason?: string;
  type: "partial" | "cancel";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleReturnItemSchema = new Schema<ISaleReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    variantId: { type: Schema.Types.ObjectId },
    name: { type: String, required: true },
    variantText: { type: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    cost: { type: Number },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const SaleReturnSchema = new Schema<ISaleReturn>(
  {
    saleId: {
      type: Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },
    saleFolio: { type: String },
    items: {
      type: [SaleReturnItemSchema],
      default: [],
    },
    totalReturned: {
      type: Number,
      required: true,
      default: 0,
    },
    reason: { type: String },
    type: {
      type: String,
      enum: ["partial", "cancel"],
      required: true,
      default: "partial",
      index: true,
    },
    createdBy: { type: String },
  },
  { timestamps: true }
);

export const SaleReturn: Model<ISaleReturn> =
  mongoose.models.SaleReturn ||
  mongoose.model<ISaleReturn>("SaleReturn", SaleReturnSchema);