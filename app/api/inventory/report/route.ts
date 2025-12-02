import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { parseSessionCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);

    // Solo quien pueda ver reportes o administrar productos
    if (
      !session ||
      (!session.permissions?.canSeeReports &&
        !session.permissions?.canManageProducts)
    ) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

    const products = await Product.find()
      .sort({ category: 1, name: 1 })
      .lean();

    const list = products.map((p: any) => {
      const cost = Number(p.cost || 0);
      const priceRetail = Number(p.priceRetail || 0);
      const stock = Number(p.stock || 0);
      const minStock = Number(p.minStock || 0);

      const valueCost = cost * stock;
      const valueRetail = priceRetail * stock;
      const grossProfit = (priceRetail - cost) * stock;

      return {
        _id: p._id.toString(),
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category || "",
        cost,
        priceRetail,
        priceWholesale: Number(p.priceWholesale || 0),
        stock,
        minStock,
        valueCost,
        valueRetail,
        grossProfit,
      };
    });

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Error en GET /api/inventory/report:", error);
    return NextResponse.json(
      {
        message: "Error al obtener reporte de inventario",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
