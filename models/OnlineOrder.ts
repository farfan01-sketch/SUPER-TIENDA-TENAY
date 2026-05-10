import mongoose, { Schema, Model, Document } from "mongoose";

export interface IOnlineOrderItem {
  productId: mongoose.Types.ObjectId | string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export type OnlineOrderStatus =
  | "pending"
  | "processed"
  | "cancelled";

export interface IOnlineOrder extends Document {
  folio: string;

  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerEmail?: string;

  items: IOnlineOrderItem[];

  totalApprox: number;

  status: OnlineOrderStatus;

  linkedSaleId?: mongoose.Types.ObjectId | string;

  createdAt: Date;
  updatedAt: Date;
}

const OnlineOrderItemSchema = new Schema<IOnlineOrderItem>(
  {
    productId: {
      type: Schema.Types.Mixed,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const OnlineOrderSchema = new Schema<IOnlineOrder>(
  {
    folio: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
      required: true,
    },

    customerAddress: {
      type: String,
    },

    customerEmail: {
      type: String,
    },

    items: {
      type: [OnlineOrderItemSchema],
      default: [],
    },

    totalApprox: {
      type: Number,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: ["pending", "processed", "cancelled"],
      default: "pending",
      index: true,
    },

    linkedSaleId: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const OnlineOrder: Model<IOnlineOrder> =
  mongoose.models.OnlineOrder ||
  mongoose.model<IOnlineOrder>(
    "OnlineOrder",
    OnlineOrderSchema
  );