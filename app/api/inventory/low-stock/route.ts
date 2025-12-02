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

    // Productos con stock bajo (stock <= minStock y minStock > 0)
    const lowStockProducts = await Product.find({
      minStock: { $gt: 0 },
      $expr: { $lte: ["$stock", "$minStock"] }, // campo vs campo
    })
      .sort({ category: 1, name: 1 })
      .lean();

    const list = (lowStockProducts || []).map((p: any) => ({
      _id: p._id.toString(),
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category || "",
      cost: Number(p.cost || 0),
      priceRetail: Number(p.priceRetail || 0),
      priceWholesale: Number(p.priceWholesale || 0),
      stock: Number(p.stock || 0),
      minStock: Number(p.minStock || 0),
    }));

    return NextResponse.json(list, { status: 200 });
  } catch (error: any) {
    console.error("Error en GET /api/inventory/low-stock:", error);
    return NextResponse.json(
      {
        message: "Error al obtener productos bajos en inventario",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
