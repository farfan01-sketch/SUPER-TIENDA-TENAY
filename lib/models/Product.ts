import mongoose, { Schema, Model, Document } from "mongoose";

export interface IVariant {
  kind: "ropa" | "maquillaje" | "perfume";
  size?: string;   // ropa
  color?: string;  // ropa
  tone?: string;   // labial / rubor
  scent?: string;  // perfume
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
  imageUrl?: string;      // base64 de la imagen
  cost: number;           // costo general (para productos sin variantes)
  priceRetail: number;    // precio general
  priceWholesale?: number;
  stock: number;          // stock general
  minStock?: number;
  isActive: boolean;
  variants: IVariant[];   // variantes por tipo
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
    cost: { type: Number, required: true },
    priceRetail: { type: Number, required: true },
    priceWholesale: { type: Number },
    stock: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    barcode: { type: String },
    category: { type: String },
    imageUrl: { type: String },
    cost: { type: Number, required: true },
    priceRetail: { type: Number, required: true },
    priceWholesale: { type: Number },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    variants: { type: [VariantSchema], default: [] },
  },
  { timestamps: true }
);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
