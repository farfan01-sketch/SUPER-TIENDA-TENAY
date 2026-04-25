import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Shift } from "@/lib/models/Shift";
import { Sale } from "@/lib/models/Sale";
import { CashCut } from "@/lib/models/CashCut";
import { parseSessionCookie } from "@/lib/auth";

function isCash(method: string) {
  return method?.toLowerCase().trim() === "efectivo";
}

function buildCashCutFolio(lastFolio?: string | null) {
  if (!lastFolio) return "CC-000001";
  const match = lastFolio.match(/(\d+)$/);
  if (!match) return "CC-000001";
  const num = parseInt(match[1], 10) + 1;
  return `CC-${num.toString().padStart(6, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { finalCash } = await req.json();

    if (finalCash == null || isNaN(finalCash)) {
      return NextResponse.json(
        { message: "El monto final es obligatorio" },
        { status: 400 }
      );
    }

    const shift = await Shift.findOne({
  status: "open",
  $or: [
    { userId: session._id },
    { username: session.username },
  ],
});

    if (!shift) {
      return NextResponse.json(
        { message: "No tienes un turno abierto" },
        { status: 400 }
      );
    }

    const closedAt = new Date();

    const sales = await Sale.find({
      shiftId: shift._id,
    }).lean();

    const activeSales = (sales as any[]).filter(
      (s) => s.status !== "cancelled"
    );

    const cancelledSales = (sales as any[]).filter(
      (s) => s.status === "cancelled"
    );

    let totalSales = 0;
    let totalCost = 0;
    let cashSales = 0;

    const totalsByMethod: Record<
      string,
      { total: number; count: number }
    > = {};

    for (const sale of activeSales) {
      totalSales += Number(sale.total || 0);

      if (Array.isArray(sale.items)) {
        for (const item of sale.items) {
          totalCost += Number(item.cost || 0) * Number(item.quantity || 0);
        }
      }

      if (Array.isArray(sale.payments)) {
        for (const payment of sale.payments) {
          const method = payment.method || "Sin método";
          const amount = Number(payment.amount || 0);

          if (!totalsByMethod[method]) {
            totalsByMethod[method] = { total: 0, count: 0 };
          }

          totalsByMethod[method].total += amount;
          totalsByMethod[method].count += 1;

          if (isCash(method)) {
            cashSales += amount;
          }
        }
      }
    }

    const profit = totalSales - totalCost;
    const expectedCash = Number(shift.initialCash || 0) + cashSales;
    const difference = Number(finalCash) - expectedCash;

    const cancelledSalesTotal = cancelledSales.reduce(
      (acc, sale: any) => acc + Number(sale.total || 0),
      0
    );

    const existingCut = await CashCut.findOne({
      shiftId: shift._id,
    });

    if (existingCut) {
      return NextResponse.json(
        { message: "Este turno ya tiene corte generado" },
        { status: 400 }
      );
    }

    const lastCut = await CashCut.findOne({}).sort({ folio: -1 }).lean();
    const folio = buildCashCutFolio((lastCut as any)?.folio);

    const cut = await CashCut.create({
      folio,
      shiftId: shift._id,
      username: shift.username,
      rangeStart: shift.openedAt,
      rangeEnd: closedAt,
      openingAmount: Number(shift.initialCash || 0),
      closingAmount: Number(finalCash),
      expectedCash,
      difference,
      totalSales,
      totalCost,
      profit,
      salesCount: activeSales.length,
      cancelledSalesCount: cancelledSales.length,
      cancelledSalesTotal,
      totalsByMethod,
      notes: `Corte automático de turno. Cajero: ${shift.username}`,
    });

    shift.finalCash = Number(finalCash);
    shift.closedAt = closedAt;
    shift.status = "closed";
    await shift.save();

    return NextResponse.json({
      message: "Turno cerrado y corte generado correctamente",
      shift: {
        _id: shift._id.toString(),
        username: shift.username,
        initialCash: shift.initialCash,
        finalCash: shift.finalCash,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
      },
      cut,
    });
  } catch (error: any) {
    console.error("Error en POST /api/shifts/close:", error);

    return NextResponse.json(
      {
        message: "Error al cerrar turno",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}