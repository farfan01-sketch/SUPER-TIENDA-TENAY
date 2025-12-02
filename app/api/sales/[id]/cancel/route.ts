import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { Product } from "@/lib/models/Product";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const { reason } = await req.json().catch(() => ({ reason: "" }));

    const sale = await Sale.findById(id);
    if (!sale) {
      return NextResponse.json(
        { message: "Venta no encontrada" },
        { status: 404 }
      );
    }

    if (sale.status === "cancelled") {
      return NextResponse.json(
        { message: "La venta ya está cancelada" },
        { status: 400 }
      );
    }

    // 🔹 Regresar stock
    if (Array.isArray(sale.items)) {
      for (const item of sale.items as any[]) {
        try {
          const product = await Product.findById(item.product);
          if (!product) continue;

          product.stock =
            (product.stock || 0) + (item.quantity || 0);

          if (item.variantKind && product.variants && product.variants.length > 0) {
            const idx = product.variants.findIndex((v: any) => {
              return (
                v.kind === item.variantKind &&
                (v.size || "") === (item.size || "") &&
                (v.color || "") === (item.color || "") &&
                (v.tone || "") === (item.tone || "") &&
                (v.scent || "") === (item.scent || "")
              );
            });

            if (idx !== -1) {
              product.variants[idx].stock =
                (product.variants[idx].stock || 0) +
                (item.quantity || 0);
            }
          }

          await product.save();
        } catch (err) {
          console.error(
            "Error regresando stock al cancelar venta:",
            err
          );
        }
      }
    }

        sale.status = "cancelled" as any;

    // Evitamos el error de TypeScript usando "as any"
    (sale as any).cancelledAt = new Date();
    if (reason) {
      (sale as any).cancellationReason = reason;
    }

    await sale.save();

    return NextResponse.json(
      { message: "Venta cancelada correctamente", sale },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error en POST /api/sales/[id]/cancel:", error);
    return NextResponse.json(
      {
        message: "Error al cancelar venta",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
