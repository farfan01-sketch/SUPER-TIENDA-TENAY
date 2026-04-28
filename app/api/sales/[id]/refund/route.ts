import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { Product } from "@/lib/models/Product";
import { Customer } from "@/lib/models/Customer";
import { SaleReturn } from "@/lib/models/SaleReturn";
import { parseSessionCookie } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
};

function isCreditMethod(method: string) {
  const clean = method?.toLowerCase().trim();
  return clean === "crédito" || clean === "credito";
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
    const body = await req.json();

    const { items, reason } = body as {
      items: {
        productId?: string;
        variantId?: string;
        quantity: number;
      }[];
      reason?: string;
    };

    const sale: any = await Sale.findById(id);

    if (!sale) {
      return NextResponse.json(
        { message: "Venta no encontrada" },
        { status: 404 }
      );
    }

    if (sale.status === "cancelled") {
      return NextResponse.json(
        { message: "No puedes devolver una venta cancelada" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "No seleccionaste productos para devolver" },
        { status: 400 }
      );
    }

    let totalReturned = 0;
    const returnItems: any[] = [];

    for (const rItem of items) {
      const qty = Math.abs(Number(rItem.quantity || 0));
      if (qty <= 0) continue;

      const originalIndex = (sale.items || []).findIndex((it: any) => {
        const sameProduct =
          String(it.productId || "") === String(rItem.productId || "");

        const originalVariant = String(it.variantId || "");
        const returnVariant = String(rItem.variantId || "");

        return sameProduct && originalVariant === returnVariant;
      });

      if (originalIndex < 0) continue;

      const original = sale.items[originalIndex];

      const soldQty = Number(original.quantity || 0);
      const alreadyReturned = Number(original.returnedQuantity || 0);
      const availableToReturn = soldQty - alreadyReturned;

      if (availableToReturn <= 0) continue;

      if (qty > availableToReturn) {
        return NextResponse.json(
          {
            message: `No puedes devolver ${qty} de ${original.name}. Solo quedan ${availableToReturn} por devolver.`,
          },
          { status: 400 }
        );
      }

      const subtotal = qty * Number(original.price || 0);
      totalReturned += subtotal;

      if (original.variantId) {
        await Product.updateOne(
          {
            _id: original.productId,
            "variants._id": original.variantId,
          },
          {
            $inc: {
              "variants.$.stock": qty,
            },
          }
        ).exec();
      } else {
        await Product.findByIdAndUpdate(original.productId, {
          $inc: { stock: qty },
        }).exec();
      }

      sale.items[originalIndex].returnedQuantity = alreadyReturned + qty;

      returnItems.push({
        productId: original.productId,
        variantId: original.variantId,
        name: original.name,
        variantText: original.variantText,
        quantity: qty,
        price: original.price,
        cost: original.cost,
        subtotal,
      });
    }

    if (returnItems.length === 0 || totalReturned <= 0) {
      return NextResponse.json(
        {
          message:
            "No se pudo procesar la devolución. Revisa que no se haya devuelto ya ese producto.",
        },
        { status: 400 }
      );
    }

    sale.subtotal = Math.max(Number(sale.subtotal || 0) - totalReturned, 0);
    sale.total = Math.max(Number(sale.total || 0) - totalReturned, 0);
    sale.totalPaid = Math.max(Number(sale.totalPaid || 0) - totalReturned, 0);

    await sale.save();

    const creditAmount = (sale.payments || [])
      .filter((p: any) => isCreditMethod(String(p.method || "")))
      .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

    if (sale.customerId && creditAmount > 0) {
      await Customer.findByIdAndUpdate(sale.customerId, {
        $inc: { currentBalance: -Math.abs(totalReturned) },
      }).exec();
    }

    const saleReturn = await SaleReturn.create({
      saleId: sale._id,
      saleFolio: sale.folio,
      items: returnItems,
      totalReturned,
      reason: reason || "Devolución parcial",
      type: "partial",
      createdBy: session.username || "Usuario",
    });

    return NextResponse.json({
      message: "Devolución registrada correctamente",
      return: saleReturn,
      sale,
    });
  } catch (error: any) {
    console.error("Error en POST /api/sales/[id]/refund:", error);

    return NextResponse.json(
      {
        message: "Error al procesar devolución",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}