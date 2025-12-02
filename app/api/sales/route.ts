import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { Product } from "@/lib/models/Product";
import { Customer } from "@/lib/models/Customer";
import { parseSessionCookie } from "@/lib/auth";

function buildSaleFolio(lastFolio?: string | null) {
  // Formato: FA-000001, FA-000002, etc.
  if (!lastFolio) return "FA-000001";
  const match = lastFolio.match(/(\d+)$/);
  if (!match) return "FA-000001";
  const num = parseInt(match[1], 10) + 1;
  return `FA-${num.toString().padStart(6, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 100;

    const sales = await Sale.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(sales);
  } catch (error: any) {
    console.error("Error en GET /api/sales:", error);
    return NextResponse.json(
      {
        message: "Error al obtener ventas",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);

    const body = await req.json();
    const {
      items,
      subtotal,
      discount,
      total,
      payments,
      customerId,
      customerName,
    } = body as {
      items: {
        productId?: string;
        name: string;
        variantText?: string;
        quantity: number;
        price: number;
        cost?: number;
        subtotal: number;
      }[];
      subtotal: number;
      discount?: number;
      total: number;
      payments: { method: string; amount: number }[];
      customerId?: string;
      customerName?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "La venta debe tener al menos un producto" },
        { status: 400 }
      );
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json(
        { message: "Debe especificarse al menos una forma de pago" },
        { status: 400 }
      );
    }

    const totalPayments = payments.reduce(
      (acc, p) => acc + Number(p.amount || 0),
      0
    );

    if (Math.abs(totalPayments - total) > 0.01) {
      return NextResponse.json(
        {
          message:
            "La suma de las formas de pago no coincide con el total",
        },
        { status: 400 }
      );
    }

    // Generar folio FA-xxxxx
    const lastSale = await Sale.findOne({})
      .sort({ folio: -1 })
      .lean();
    const folio = buildSaleFolio(lastSale?.folio);

     const cashierName = session?.username || "Cajero";

    // Crear venta
    const sale = await (Sale as any).create({
      folio,
      items,
      subtotal,
      discount: Number(discount || 0),
      total,
      payments,
      customerId: customerId || undefined,
      customerName: customerName || undefined,
      cashier: cashierName,
      status: "completed",
    });

    // Actualizar inventario (restar stock)
    for (const item of items) {
      if (!item.productId) continue;
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -Math.abs(item.quantity) },
      }).exec();
    }

    // Lógica de crédito: si hay pago "Crédito" y cliente
    if (customerId) {
      const creditAmount = payments
        .filter(
          (p) => p.method && p.method.toLowerCase() === "crédito"
        )
        .reduce(
          (acc, p) => acc + Number(p.amount || 0),
          0
        );

      if (creditAmount > 0) {
        const customer = await Customer.findById(customerId);
        if (customer) {
          customer.currentBalance =
            Number(customer.currentBalance || 0) +
            creditAmount;
          await customer.save();
        }
      }
    }

    return NextResponse.json(
      {
        message: "Venta registrada correctamente",
        sale,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en POST /api/sales:", error);
    return NextResponse.json(
      {
        message: "Error al registrar venta",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
