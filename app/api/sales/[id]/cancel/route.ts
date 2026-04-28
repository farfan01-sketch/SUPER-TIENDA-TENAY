import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { Product } from "@/lib/models/Product";
import { Customer } from "@/lib/models/Customer";
import { parseSessionCookie } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
};

function isCreditMethod(method: string) {
  return method?.toLowerCase().trim() === "crédito";
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);

    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Cancelación de venta";

    const sale: any = await Sale.findById(id);

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

    for (const item of sale.items || []) {
      if (!item.productId) continue;

      const qty = Math.abs(Number(item.quantity || 0));

      if (item.variantId) {
        await Product.updateOne(
          {
            _id: item.productId,
            "variants._id": item.variantId,
          },
          {
            $inc: {
              "variants.$.stock": qty,
            },
          }
        ).exec();
      } else {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: qty },
        }).exec();
      }
    }

    const creditAmount = (sale.payments || [])
      .filter((p: any) => isCreditMethod(String(p.method || "")))
      .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

    if (sale.customerId && creditAmount > 0) {
      await Customer.findByIdAndUpdate(sale.customerId, {
        $inc: { currentBalance: -Math.abs(creditAmount) },
      }).exec();
    }

    sale.status = "cancelled";
    sale.cancelReason = reason;
    sale.cancellationReason = reason;
    sale.cancelledAt = new Date();
    sale.cancelledBy = session.username || "Usuario";

    await sale.save();

    return NextResponse.json({
      message: "Venta cancelada correctamente",
      sale,
    });
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