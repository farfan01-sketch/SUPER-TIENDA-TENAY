import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { SaleReturn } from "@/lib/models/SaleReturn";
import { CashCut } from "@/lib/models/CashCut";
import { Config } from "@/lib/models/Config";
import { parseSessionCookie } from "@/lib/auth";

function buildCashCutFolio(lastFolio?: string | null) {
  if (!lastFolio) return "CC-000001";
  const match = lastFolio.match(/(\d+)$/);
  if (!match) return "CC-000001";
  const num = parseInt(match[1], 10) + 1;
  return `CC-${num.toString().padStart(6, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter: any = {};

    if (from) {
      filter.createdAt = {
        ...(filter.createdAt || {}),
        $gte: new Date(from),
      };
    }

    if (to) {
      filter.createdAt = {
        ...(filter.createdAt || {}),
        $lte: new Date(to),
      };
    }

    const cuts = await CashCut.find(filter).sort({ createdAt: -1 }).lean();

    return NextResponse.json(cuts);
  } catch (error: any) {
    console.error("Error en GET /api/cashcuts:", error);
    return NextResponse.json(
      {
        message: "Error al obtener cortes de caja",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);

    if (!session || !session.permissions?.canDoCashCuts) {
      return NextResponse.json(
        { message: "No autorizado para corte de caja" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { notes } = body as { notes?: string };

    const lastCut = await CashCut.findOne().sort({ rangeEnd: -1 }).lean();

    const rangeStart = lastCut?.rangeEnd
      ? new Date(lastCut.rangeEnd)
      : new Date(0);

    const rangeEnd = new Date();

    const sales = await Sale.find({
      createdAt: {
        $gt: rangeStart,
        $lte: rangeEnd,
      },
    }).lean();

    const returns = await SaleReturn.find({
      createdAt: {
        $gt: rangeStart,
        $lte: rangeEnd,
      },
    }).lean();

    if ((!sales || sales.length === 0) && (!returns || returns.length === 0)) {
      return NextResponse.json(
        { message: "No hay movimientos nuevos desde el último corte" },
        { status: 400 }
      );
    }

    const activeSales = (sales as any[]).filter(
      (sale) => sale.status !== "cancelled"
    );

    const cancelledSales = (sales as any[]).filter(
      (sale) => sale.status === "cancelled"
    );

    let totalSales = 0;
    let totalDiscounts = 0;
    let totalCost = 0;

    const totalsByMethod: Record<string, { total: number; count: number }> = {};

    for (const sale of activeSales) {
      const saleTotal = Number(sale.total || 0);
      const discount = Number(sale.discount || 0);
      const items = sale.items || [];
      const payments = sale.payments || [];

      totalSales += saleTotal;
      totalDiscounts += discount;

      for (const item of items) {
        const cost = Number(item.cost ?? 0);
        const qty = Number(item.quantity ?? 1);
        totalCost += cost * qty;
      }

      for (const payment of payments) {
        const method = String(payment.method || "SIN MÉTODO");
        const amount = Number(payment.amount || 0);

        if (!totalsByMethod[method]) {
          totalsByMethod[method] = { total: 0, count: 0 };
        }

        totalsByMethod[method].total += amount;
        totalsByMethod[method].count += 1;
      }
    }

    const cancelledSalesCount = cancelledSales.length;
    const cancelledSalesTotal = cancelledSales.reduce(
      (acc, sale: any) => acc + Number(sale.total || 0),
      0
    );

    const returnsCount = returns.length;
    const returnsTotal = (returns as any[]).reduce(
      (acc, ret) => acc + Number(ret.totalReturned || 0),
      0
    );

    let returnsCost = 0;

    for (const ret of returns as any[]) {
      for (const item of ret.items || []) {
        const cost = Number(item.cost || 0);
        const qty = Number(item.quantity || 0);
        returnsCost += cost * qty;
      }
    }

    const grossNetSales = totalSales - totalDiscounts;
    const netSales = grossNetSales - returnsTotal;

    const realCost = totalCost - returnsCost;
    const profit = netSales - realCost;

    const efectivoVentas = Object.entries(totalsByMethod).reduce(
      (acc, [method, info]) => {
        if (method.toLowerCase().trim() === "efectivo") {
          return acc + Number(info.total || 0);
        }
        return acc;
      },
      0
    );

    const openingAmount = 0;
    const closingAmount = efectivoVentas - returnsTotal;
    const expectedCash = openingAmount + efectivoVentas - returnsTotal;
    const difference = closingAmount - expectedCash;

    const lastFolio =
      lastCut?.folio ||
      (await CashCut.findOne().sort({ folio: -1 }).lean())?.folio;

    const folio = buildCashCutFolio(lastFolio);

    const cut = await CashCut.create({
      folio,
      rangeStart,
      rangeEnd,

      openingAmount,
      closingAmount,
      expectedCash,
      difference,

      totalSales,
      totalDiscounts,
      netSales,
      totalCost: realCost,
      profit,

      salesCount: activeSales.length,
      saleCount: activeSales.length,

      cancelledSalesCount,
      cancelledSalesTotal,

      returnsCount,
      returnsTotal,
      returnsCost,

      totalsByMethod,

      payments: Object.entries(totalsByMethod).map(([method, info]) => ({
        method,
        amount: info.total,
      })),

      userId: session._id,
      username: session.username,
      notes:
        notes ||
        `Ventas activas: ${activeSales.length}. Cancelaciones: ${cancelledSalesCount}. Total cancelado: $${cancelledSalesTotal.toFixed(
          2
        )}. Devoluciones: ${returnsCount}. Total devuelto: $${returnsTotal.toFixed(
          2
        )}.`,
    });

    const config = await Config.findOne({
      singletonKey: "main",
    }).lean();

    return NextResponse.json(
      {
        message: "Corte generado correctamente",
        cut,
        config,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en POST /api/cashcuts:", error);

    return NextResponse.json(
      {
        message: "Error al generar corte de caja",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}