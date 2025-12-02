import mongoose, { Schema, Model, Document } from "mongoose";

export type AdjustmentType = "in" | "out";

export interface IInventoryAdjustment extends Document {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  type: AdjustmentType; // "in" (entrada), "out" (salida)
  reason?: string;
  userId?: mongoose.Types.ObjectId | string;
  username?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryAdjustmentSchema = new Schema<IInventoryAdjustment>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Product",
    },
    productName: { type: String, required: true },
    sku: String,
    barcode: String,
    quantity: { type: Number, required: true },
    type: {
      type: String,
      enum: ["in", "out"],
      required: true,
    },
    reason: String,
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    username: String,
  },
  { timestamps: true }
);

export const InventoryAdjustment: Model<IInventoryAdjustment> =
  mongoose.models.InventoryAdjustment ||
  mongoose.model<IInventoryAdjustment>(
    "InventoryAdjustment",
    InventoryAdjustmentSchema
  );
