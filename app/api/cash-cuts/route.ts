import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { CashCut } from "@/lib/models/CashCut";

type PaymentMethod =
  | "Efectivo"
  | "Tarjeta – Crédito"
  | "Tarjeta – Débito"
  | "Transferencia"
  | "MercadoPago"
  | "Crédito"
  | "Mixto"
  | string;

function parseDateOnly(dateStr: string): { from: Date; to: Date } {
  const [y, m, d] = dateStr.split("-").map((n) => Number(n));
  const from = new Date(y, m - 1, d, 0, 0, 0, 0);
  const to = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { from, to };
}

export async function GET() {
  try {
    await connectDB();
    const cuts = await CashCut.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return NextResponse.json(cuts);
  } catch (error: any) {
    console.error("Error en GET /api/cash-cuts:", error);
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

    const body = await req.json();
    const {
      fromDate,
      toDate,
      openingAmount,
      closingAmount,
      notes,
    } = body as {
      fromDate: string;
      toDate: string;
      openingAmount: number;
      closingAmount: number;
      notes?: string;
    };

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { message: "fromDate y toDate son requeridos" },
        { status: 400 }
      );
    }

    if (
      typeof openingAmount !== "number" ||
      typeof closingAmount !== "number"
    ) {
      return NextResponse.json(
        {
          message:
            "openingAmount y closingAmount deben ser numéricos",
        },
        { status: 400 }
      );
    }

    const { from } = parseDateOnly(fromDate);
    const { to } = parseDateOnly(toDate);

    // 🔹 Traer TODAS las ventas del rango (completed + cancelled)
    const sales = await Sale.find({
      createdAt: { $gte: from, $lte: to },
    }).lean();

    const activeSales = sales.filter(
      (s: any) => s.status !== "cancelled"
    );
    const cancelledSales = sales.filter(
      (s: any) => s.status === "cancelled"
    );

    let totalSales = 0;
    let totalCost = 0;
    let salesCount = activeSales.length;

    const totalsByMethodMap = new Map<PaymentMethod, number>();

    // 🔹 Ventas COMPLETADAS: totales, costo y pagos
    for (const s of activeSales as any[]) {
      const saleTotal = s.total || 0;
      totalSales += saleTotal;

      // costo de mercancía vendida
      if (Array.isArray(s.items)) {
        for (const item of s.items) {
          const cost = item.cost || 0;
          const qty = item.quantity || 0;
          totalCost += cost * qty;
        }
      }

      // totales por forma de pago
      if (Array.isArray(s.payments)) {
        for (const p of s.payments as any[]) {
          const method = p.method as PaymentMethod;
          const amount = p.amount || 0;
          const current = totalsByMethodMap.get(method) || 0;
          totalsByMethodMap.set(method, current + amount);
        }
      }
    }

    const profit = totalSales - totalCost;

    // 🔹 Ventas canceladas
    const cancelledSalesCount = cancelledSales.length;
    const cancelledSalesTotal = cancelledSales.reduce(
      (acc: number, s: any) => acc + (s.total || 0),
      0
    );

    // 🔹 efectivo de ventas COMPLETADAS
    const efectivoVentas = totalsByMethodMap.get("efectivo") || 0;
    const expectedCash = openingAmount + efectivoVentas;
    const difference = closingAmount - expectedCash;

    const totalsByMethod = Array.from(
      totalsByMethodMap.entries()
    ).map(([method, amount]) => ({
      method,
      amount,
    }));

    const cut = await CashCut.create({
      rangeStart: from,
      rangeEnd: to,
      openingAmount,
      closingAmount,
      expectedCash,
      difference,
      totalSales,
      totalCost,
      profit,
      salesCount,
      cancelledSalesCount,
      cancelledSalesTotal,
      totalsByMethod,
      notes,
    });

    return NextResponse.json(cut, { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/cash-cuts:", error);
    return NextResponse.json(
      {
        message: "Error al generar corte de caja",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
