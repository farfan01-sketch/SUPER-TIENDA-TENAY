import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type InventoryMovementType =
  | "entrada"
  | "salida"
  | "venta"
  | "ajuste"
  | "devolucion"
  | "cancelacion";

export interface IInventoryMovement extends Document {
  product: Types.ObjectId;
  variantId?: string;
  type: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  cost: number;
  priceRetail: number;
  priceWholesale?: number;
  reason?: string;
  referenceId?: string;
  referenceType?: string;
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
    variantId: { type: String },

    type: {
      type: String,
      enum: ["entrada", "salida", "venta", "ajuste", "devolucion", "cancelacion"],
      required: true,
    },

    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },

    cost: { type: Number, required: true, default: 0 },
    priceRetail: { type: Number, required: true, default: 0 },
    priceWholesale: { type: Number },

    reason: { type: String },
    referenceId: { type: String },
    referenceType: { type: String },

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