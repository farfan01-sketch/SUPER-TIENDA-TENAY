import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { Product } from "@/lib/models/Product";
import { Customer } from "@/lib/models/Customer";
import { parseSessionCookie } from "@/lib/auth";

function buildSaleFolio(lastFolio?: string | null) {
  if (!lastFolio) return "FA-000001";
  const match = lastFolio.match(/(\d+)$/);
  if (!match) return "FA-000001";
  const num = parseInt(match[1], 10) + 1;
  return `FA-${num.toString().padStart(6, "0")}`;
}

function isCashMethod(method: string) {
  return method?.toLowerCase().trim() === "efectivo";
}

function isCreditMethod(method: string) {
  return method?.toLowerCase().trim() === "crédito";
}

function normalizePayments(
  payments: { method: string; amount: number }[],
  total: number
) {
  const cleanPayments = payments.map((p) => ({
    method: p.method,
    amount: Number(p.amount || 0),
  }));

  const cashIndex = cleanPayments.findIndex((p) => isCashMethod(p.method));

  if (cashIndex >= 0 && cleanPayments[cashIndex].amount === 0) {
    const nonCashTotal = cleanPayments
      .filter((_, index) => index !== cashIndex)
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);

    const remaining = Number(total || 0) - nonCashTotal;
    cleanPayments[cashIndex].amount = remaining > 0 ? remaining : 0;
  }

  const totalPaid = cleanPayments.reduce(
    (acc, p) => acc + Number(p.amount || 0),
    0
  );

  const hasCash = cleanPayments.some((p) => isCashMethod(p.method));

  if (!hasCash && Math.abs(totalPaid - total) > 0.01) {
    return {
      ok: false,
      payments: cleanPayments,
      totalPaid,
      change: 0,
      message: "La suma de las formas de pago debe coincidir con el total",
    };
  }

  if (hasCash && totalPaid < total) {
    return {
      ok: false,
      payments: cleanPayments,
      totalPaid,
      change: 0,
      message: "El pago recibido es menor al total",
    };
  }

  return {
    ok: true,
    payments: cleanPayments,
    totalPaid,
    change: hasCash ? Math.max(totalPaid - Number(total || 0), 0) : 0,
    message: "Pagos correctos",
  };
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
      shiftId,
    } = body as {
      items: {
        productId?: string;
        variantId?: string;
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
      shiftId?: string;
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

    const normalized = normalizePayments(payments, Number(total || 0));

    if (!normalized.ok) {
      return NextResponse.json(
        {
          message: normalized.message,
          total,
          totalPaid: normalized.totalPaid,
          change: normalized.change,
        },
        { status: 400 }
      );
    }

    const creditAmount = normalized.payments
      .filter((p) => isCreditMethod(p.method))
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);

    if (creditAmount > 0 && !customerId) {
      return NextResponse.json(
        { message: "Para usar crédito debes seleccionar un cliente" },
        { status: 400 }
      );
    }

    const lastSale = await Sale.findOne({}).sort({ folio: -1 }).lean();
    const folio = buildSaleFolio(lastSale?.folio);
    const cashierName = session?.username || "Cajero";

    const sale = await (Sale as any).create({
      folio,
      items,
      subtotal,
      discount: Number(discount || 0),
      total,
      payments: normalized.payments,
      totalPaid: normalized.totalPaid,
      change: normalized.change,
      customerId: customerId || undefined,
      customerName: customerName || undefined,
      cashier: cashierName,
      shiftId: shiftId || undefined,
      status: "completed",
    });

    for (const item of items) {
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
              "variants.$.stock": -qty,
            },
          }
        ).exec();
      } else {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -qty },
        }).exec();
      }
    }

    if (customerId && creditAmount > 0) {
      const customer = await Customer.findById(customerId);

      if (customer) {
        customer.currentBalance =
          Number(customer.currentBalance || 0) + creditAmount;
        await customer.save();
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