import {
  Schema,
  model,
  models,
  type Document,
} from "mongoose";

export type CashCutTotalsByMethod = {
  [method: string]: {
    total: number;
    count: number;
  };
};

export interface ICashCut extends Document {
  folio: string;
  rangeStart: Date;
  rangeEnd: Date;
  openingAmount: number;       // Monto de apertura
  closingAmount: number;       // Efectivo real al cierre
  expectedCash: number;        // Efectivo esperado (según ventas)
  difference: number;          // closingAmount - expectedCash
  totalSales: number;          // Total vendido
  totalCost: number;           // Costo de lo vendido
  profit: number;              // Utilidad
  salesCount: number;          // Número de ventas
  cancelledSalesCount: number; // Ventas canceladas
  cancelledSalesTotal: number; // Monto total cancelado
  totalsByMethod: CashCutTotalsByMethod; // Totales por forma de pago
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashCutSchema = new Schema<ICashCut>(
  {
    folio: { type: String, required: true, unique: true },
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
  {
    timestamps: true,
  }
);

export const CashCut =
  models.CashCut || model<ICashCut>("CashCut", CashCutSchema);
