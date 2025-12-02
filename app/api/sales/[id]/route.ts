import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    const sale = await Sale.findById(id).lean();
    if (!sale) {
      return NextResponse.json(
        { message: "Venta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(sale);
  } catch (error: any) {
    console.error("Error en GET /api/sales/[id]:", error);
    return NextResponse.json(
      {
        message: "Error al obtener venta",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
