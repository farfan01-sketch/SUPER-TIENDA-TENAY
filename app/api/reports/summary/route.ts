import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { Product } from "@/lib/models/Product";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // formato: YYYY-MM-DD

    let from: Date;
    let to: Date;

    if (dateStr) {
      // Día específico
      from = new Date(`${dateStr}T00:00:00.000`);
      to = new Date(`${dateStr}T23:59:59.999`);
    } else {
      // Hoy por defecto (según zona del server)
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const d = now.getDate();
      from = new Date(y, m, d, 0, 0, 0, 0);
      to = new Date(y, m, d, 23, 59, 59, 999);
    }

    // 🔹 Ventas del día
    const sales = await Sale.find({
  createdAt: { $gte: from, $lte: to },
  status: { $ne: "cancelled" },
}).lean();

    let totalSales = 0;
    let totalCost = 0;

    for (const s of sales) {
      totalSales += s.total || 0;

      if (Array.isArray(s.items)) {
        for (const item of s.items as any[]) {
          const cost = item.cost || 0;
          const qty = item.quantity || 0;
          totalCost += cost * qty;
        }
      }
    }

    const profit = totalSales - totalCost;

    // 🔹 Inventario: valor a costo y valor a precio de venta
    const products = await Product.find().lean();

    let inventoryCostValue = 0;
    let inventoryRetailValue = 0;

    for (const p of products as any[]) {
      const baseStock = p.stock || 0;
      const baseCost = p.cost || 0;
      const basePriceRetail = p.priceRetail || 0;

      // Stock general (sin variante)
      inventoryCostValue += baseStock * baseCost;
      inventoryRetailValue += baseStock * basePriceRetail;

      // Variantes
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        for (const v of p.variants) {
          const vStock = v.stock || 0;
          const vCost =
            v.cost != null ? v.cost : baseCost;
          const vPriceRetail =
            v.priceRetail != null
              ? v.priceRetail
              : basePriceRetail;

          inventoryCostValue += vStock * vCost;
          inventoryRetailValue += vStock * vPriceRetail;
        }
      }
    }

    return NextResponse.json({
      date: from.toISOString(),
      totalSales,
      totalCost,
      profit,
      salesCount: sales.length,
      inventoryCostValue,
      inventoryRetailValue,
    });
  } catch (error: any) {
    console.error("Error en GET /api/reports/summary:", error);
    return NextResponse.json(
      {
        message: "Error al obtener resumen",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
