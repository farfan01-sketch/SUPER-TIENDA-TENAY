import {
  Schema,
  model,
  models,
  type Document,
  Types,
} from "mongoose";

export type CashCutTotalsByMethod = {
  [method: string]: {
    total: number;
    count: number;
  };
};

export interface ICashCut extends Document {
  folio: string;
  shiftId?: Types.ObjectId;
  username?: string;
  rangeStart: Date;
  rangeEnd: Date;
  openingAmount: number;
  closingAmount: number;
  expectedCash: number;
  difference: number;
  totalSales: number;
  totalCost: number;
  profit: number;
  salesCount: number;
  cancelledSalesCount: number;
  cancelledSalesTotal: number;
  totalsByMethod: CashCutTotalsByMethod;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashCutSchema = new Schema<ICashCut>(
  {
    folio: { type: String, required: true, unique: true },

    shiftId: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
      index: true,
    },

    username: {
      type: String,
      trim: true,
    },

    rangeStart: { type: Date, required: true },
    rangeEnd: { type: Date, required: true },

    openingAmount: { type: Number, required: true, default: 0 },
    closingAmount: { type: Number, required: true, default: 0 },
    expectedCash: { type: Number, required: true, default: 0 },
    difference: { type: Number, required: true, default: 0 },

    totalSales: { type: Number, required: true, default: 0 },
    totalCost: { type: Number, required: true, default: 0 },
    profit: { type: Number, required: true, default: 0 },

    salesCount: { type: Number, required: true, default: 0 },
    cancelledSalesCount: { type: Number, required: true, default: 0 },
    cancelledSalesTotal: { type: Number, required: true, default: 0 },

    totalsByMethod: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },

    notes: { type: String },
  },
  { timestamps: true }
);

export const CashCut =
  models.CashCut || model<ICashCut>("CashCut", CashCutSchema);