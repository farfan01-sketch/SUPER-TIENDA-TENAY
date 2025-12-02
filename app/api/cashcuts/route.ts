import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { CashCut } from "@/lib/models/CashCut";
import { Config } from "@/lib/models/Config";
import { parseSessionCookie } from "@/lib/auth";

function buildCashCutFolio(lastFolio?: string | null) {
  // Formato: CC-000001, CC-000002, etc.
  if (!lastFolio) return "CC-000001";
  const match = lastFolio.match(/(\d+)$/);
  if (!match) return "CC-000001";
  const num = parseInt(match[1], 10) + 1;
  return `CC-${num.toString().padStart(6, "0")}`;
}

// GET: lista de cortes
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

    const cuts = await CashCut.find(filter)
      .sort({ createdAt: -1 })
      .lean();

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

// POST: generar corte desde última fecha hasta ahora
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

    // 1. Buscar último corte
    const lastCut = await CashCut.findOne()
      .sort({ rangeEnd: -1 })
      .lean();

    const rangeStart = lastCut?.rangeEnd
      ? new Date(lastCut.rangeEnd)
      : new Date(0); // desde el inicio

    const rangeEnd = new Date();

    // 2. Traer ventas completadas en ese rango
    const sales = await Sale.find({
      status: { $ne: "cancelled" },
      createdAt: {
        $gt: rangeStart,
        $lte: rangeEnd,
      },
    }).lean();

    if (!sales || sales.length === 0) {
      return NextResponse.json(
        {
          message:
            "No hay ventas nuevas desde el último corte",
        },
        { status: 400 }
      );
    }

    let totalSales = 0;
    let totalDiscounts = 0;
    let totalCost = 0;
    let saleCount = sales.length;
    const paymentMap = new Map<string, number>();

    for (const sale of sales as any[]) {
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

      for (const p of payments) {
        const method = String(p.method || "SIN MÉTODO");
        const amount = Number(p.amount || 0);
        paymentMap.set(
          method,
          (paymentMap.get(method) || 0) + amount
        );
      }
    }

    const netSales = totalSales - totalDiscounts;
    const profit = netSales - totalCost;

    const payments = Array.from(paymentMap.entries()).map(
      ([method, amount]) => ({ method, amount })
    );

    // 3. Generar folio de corte
    const lastFolio =
      lastCut?.folio || (await CashCut.findOne().sort({ folio: -1 }).lean())?.folio;
    const folio = buildCashCutFolio(lastFolio);

    const cut = await CashCut.create({
      folio,
      rangeStart,
      rangeEnd,
      totalSales,
      totalDiscounts,
      netSales,
      totalCost,
      profit,
      payments,
      saleCount,
      userId: session._id,
      username: session.username,
      notes: notes || "",
    });

    // 4. Devolver corte + config (por si quieres para impresión inmediata)
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
