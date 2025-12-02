import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type InventoryMovementType = "entrada" | "ajuste";

export interface IInventoryMovement extends Document {
  product: Types.ObjectId;
  type: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  cost: number;
  priceRetail: number;
  priceWholesale?: number;
  reason?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    type: {
      type: String,
      enum: ["entrada", "ajuste"],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    cost: { type: Number, required: true },
    priceRetail: { type: Number, required: true },
    priceWholesale: { type: Number },
    reason: { type: String },
    createdById: { type: String },
    createdByName: { type: String },
  },
  {
    timestamps: true,
  }
);

export const InventoryMovement: Model<IInventoryMovement> =
  mongoose.models.InventoryMovement ||
  mongoose.model<IInventoryMovement>(
    "InventoryMovement",
    InventoryMovementSchema
  );
