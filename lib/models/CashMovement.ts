import mongoose, { Schema, Model, Document } from "mongoose";

export type CashMovementType =
  | "opening"
  | "income"
  | "expense"
  | "customerPayment"
  | "adjustment";

export interface ICashMovement extends Document {
  type: CashMovementType;
  direction: "in" | "out";
  amount: number;
  description?: string;
  userId?: string;
  username?: string;
  saleId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CashMovementSchema = new Schema<ICashMovement>(
  {
    type: {
      type: String,
      enum: [
        "opening",
        "income",
        "expense",
        "customerPayment",
        "adjustment",
      ],
      required: true,
    },
    direction: {
      type: String,
      enum: ["in", "out"],
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String },
    userId: { type: String },
    username: { type: String },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
  },
  { timestamps: true }
);

export const CashMovement: Model<ICashMovement> =
  mongoose.models.CashMovement ||
  mongoose.model<ICashMovement>("CashMovement", CashMovementSchema);
