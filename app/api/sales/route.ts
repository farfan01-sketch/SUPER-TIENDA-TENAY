import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { Product } from "@/lib/models/Product";
import { Customer } from "@/lib/models/Customer";
import { InventoryMovement } from "@/lib/models/InventoryMovement";
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
      if (qty <= 0) continue;

      const product = await Product.findById(item.productId);
      if (!product) continue;

      if (item.variantId) {
        const variant: any = (product.variants || []).find(
          (v: any) => v._id?.toString() === item.variantId
        );

        if (!variant) continue;

        const previousStock = Number(variant.stock || 0);
        const newStock = previousStock - qty;

        variant.stock = newStock;
        await product.save();

        await InventoryMovement.create({
          product: product._id,
          variantId: item.variantId,
          type: "venta",
          quantity: -qty,
          previousStock,
          newStock,
          cost: Number(item.cost ?? product.cost ?? 0),
          priceRetail: Number(item.price ?? product.priceRetail ?? 0),
          priceWholesale: product.priceWholesale,
          reason: `Venta ${folio}${item.variantText ? ` - ${item.variantText}` : ""}`,
          referenceId: sale._id.toString(),
          referenceType: "Sale",
          createdById: session?._id,
          createdByName: cashierName,
        });
      } else {
        const previousStock = Number(product.stock || 0);
        const newStock = previousStock - qty;

        product.stock = newStock;
        await product.save();

        await InventoryMovement.create({
          product: product._id,
          type: "venta",
          quantity: -qty,
          previousStock,
          newStock,
          cost: Number(item.cost ?? product.cost ?? 0),
          priceRetail: Number(item.price ?? product.priceRetail ?? 0),
          priceWholesale: product.priceWholesale,
          reason: `Venta ${folio}`,
          referenceId: sale._id.toString(),
          referenceType: "Sale",
          createdById: session?._id,
          createdByName: cashierName,
        });
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