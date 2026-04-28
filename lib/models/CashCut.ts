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
  userId?: Types.ObjectId;
  username?: string;

  rangeStart: Date;
  rangeEnd: Date;

  openingAmount: number;
  closingAmount: number;
  expectedCash: number;
  difference: number;

  totalSales: number;
  totalDiscounts: number;
  netSales: number;
  totalCost: number;
  profit: number;

  salesCount: number;
  saleCount: number;

  cancelledSalesCount: number;
  cancelledSalesTotal: number;

  returnsCount: number;
  returnsTotal: number;
  returnsCost: number;

  totalsByMethod: CashCutTotalsByMethod;
  payments: { method: string; amount: number }[];

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

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    totalDiscounts: { type: Number, required: true, default: 0 },
    netSales: { type: Number, required: true, default: 0 },
    totalCost: { type: Number, required: true, default: 0 },
    profit: { type: Number, required: true, default: 0 },

    salesCount: { type: Number, required: true, default: 0 },
    saleCount: { type: Number, required: true, default: 0 },

    cancelledSalesCount: { type: Number, required: true, default: 0 },
    cancelledSalesTotal: { type: Number, required: true, default: 0 },

    returnsCount: { type: Number, required: true, default: 0 },
    returnsTotal: { type: Number, required: true, default: 0 },
    returnsCost: { type: Number, required: true, default: 0 },

    totalsByMethod: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },

    payments: {
      type: [
        {
          method: { type: String, required: true },
          amount: { type: Number, required: true, default: 0 },
        },
      ],
      default: [],
    },

    notes: { type: String },
  },
  { timestamps: true }
);

export const CashCut =
  models.CashCut || model<ICashCut>("CashCut", CashCutSchema);