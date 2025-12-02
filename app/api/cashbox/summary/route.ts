import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CashCut } from "@/lib/models/CashCut";
import { Sale } from "@/lib/models/Sale";
import { CashMovement } from "@/lib/models/CashMovement";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();

    const lastCut = await CashCut.findOne()
      .sort({ rangeEnd: -1 })
      .lean();

    const rangeStart = lastCut?.rangeEnd
      ? new Date(lastCut.rangeEnd)
      : new Date(0);
    const rangeEnd = new Date();

    // Ventas en el rango
    const sales = await Sale.find({
      status: { $ne: "cancelled" },
      createdAt: { $gt: rangeStart, $lte: rangeEnd },
    }).lean();

    let cashFromSales = 0;

    for (const sale of sales as any[]) {
      const payments = sale.payments || [];
      for (const p of payments) {
        const method = String(p.method || "");
        const amount = Number(p.amount || 0);
        // Consideramos solo "Efectivo"
        if (method === "Efectivo") {
          cashFromSales += amount;
        }
      }
    }

    // Movimientos de caja en el rango
    const movements = await CashMovement.find({
      createdAt: { $gt: rangeStart, $lte: rangeEnd },
    }).lean();

    let totalIn = 0;
    let totalOut = 0;

    let openings = 0;
    let incomes = 0;
    let expenses = 0;
    let customerPayments = 0;
    let adjustments = 0;

    for (const m of movements as any[]) {
      const amount = Number(m.amount || 0);
      if (m.direction === "in") {
        totalIn += amount;
      } else {
        totalOut += amount;
      }

      switch (m.type) {
        case "opening":
          openings += amount;
          break;
        case "income":
          incomes += amount;
          break;
        case "expense":
          expenses += amount;
          break;
        case "customerPayment":
          customerPayments += amount;
          break;
        case "adjustment":
          adjustments += amount;
          break;
        default:
          break;
      }
    }

    const theoreticalCash =
      cashFromSales + totalIn - totalOut;

    return NextResponse.json({
      from: rangeStart,
      to: rangeEnd,
      cashFromSales,
      totalIn,
      totalOut,
      theoreticalCash,
      breakdown: {
        openings,
        incomes,
        expenses,
        customerPayments,
        adjustments,
      },
      lastCut,
    });
  } catch (error: any) {
    console.error("Error en GET /api/cashbox/summary:", error);
    return NextResponse.json(
      {
        message: "Error al calcular resumen de caja",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
