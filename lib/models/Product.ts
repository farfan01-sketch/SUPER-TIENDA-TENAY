import mongoose, { Schema, Model, Document } from "mongoose";

export interface IVariant {
  _id?: mongoose.Types.ObjectId;
  kind: "ropa" | "maquillaje" | "perfume";
  size?: string;
  color?: string;
  tone?: string;
  scent?: string;
  cost: number;
  priceRetail: number;
  priceWholesale?: number;
  stock: number;
}

export interface IProduct extends Document {
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  imageUrl?: string;
  useVariants: boolean;
  cost: number;
  priceRetail: number;
  priceWholesale?: number;
  stock: number;
  minStock?: number;
  isActive: boolean;
  variants: IVariant[];
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IVariant>(
  {
    kind: {
      type: String,
      enum: ["ropa", "maquillaje", "perfume"],
      required: true,
    },
    size: { type: String },
    color: { type: String },
    tone: { type: String },
    scent: { type: String },
    cost: { type: Number, required: true, default: 0 },
    priceRetail: { type: Number, required: true, default: 0 },
    priceWholesale: { type: Number, default: 0 },
    stock: { type: Number, required: true, default: 0 },
  },
  { _id: true }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    barcode: { type: String },
    category: { type: String },
    imageUrl: { type: String },

    useVariants: { type: Boolean, default: false },

    cost: { type: Number, required: true, default: 0 },
    priceRetail: { type: Number, required: true, default: 0 },
    priceWholesale: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    variants: { type: [VariantSchema], default: [] },
  },
  { timestamps: true }
);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);