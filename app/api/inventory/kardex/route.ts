import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { Sale } from "@/lib/models/Sale";
import { InventoryAdjustment } from "@/lib/models/InventoryAdjustment";
import { parseSessionCookie } from "@/lib/auth";
import mongoose from "mongoose";

type KardexMovement = {
  date: string;
  type: string;
  reference?: string;
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  note?: string;
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);

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

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const skuOrBarcode = searchParams.get("skuOrBarcode");

    if (!productId && !skuOrBarcode) {
      return NextResponse.json(
        {
          message:
            "Debes enviar productId o skuOrBarcode como parámetro",
        },
        { status: 400 }
      );
    }

    let product: any = null;

    if (productId && mongoose.isValidObjectId(productId)) {
      product = await Product.findById(productId).lean();
    } else if (skuOrBarcode) {
      product = await Product.findOne({
        $or: [
          { sku: skuOrBarcode },
          { barcode: skuOrBarcode },
        ],
      }).lean();
    }

    if (!product) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const prodId = product._id;

    // MOVIMIENTOS POR VENTAS
    const sales = await Sale.find({
      "items.productId": prodId,
    })
      .sort({ createdAt: 1 })
      .lean();

    const saleMovements: KardexMovement[] = [];

    for (const sale of sales) {
      const saleDate: Date = sale.createdAt || new Date();
      const folio: string = sale.folio || "";
      const items = sale.items || [];

      for (const item of items) {
        if (
          item.productId?.toString() === prodId.toString()
        ) {
          const qty = Number(item.quantity || 0);
          if (qty <= 0) continue;

          saleMovements.push({
            date: saleDate.toISOString(),
            type: "VENTA",
            reference: folio,
            quantityIn: 0,
            quantityOut: qty,
            balanceAfter: 0, // se calcula después
            note: item.variantText || "",
          });
        }
      }
    }

    // MOVIMIENTOS POR AJUSTES
    const adjustments = await InventoryAdjustment.find({
      productId: prodId,
    })
      .sort({ createdAt: 1 })
      .lean();

    const adjMovements: KardexMovement[] = adjustments.map(
      (adj: any) => {
        const isIn = adj.type === "in";
        const qty = Number(adj.quantity || 0);

        return {
          date: (adj.createdAt || new Date()).toISOString(),
          type: isIn ? "AJUSTE +" : "AJUSTE -",
          reference: adj._id?.toString(),
          quantityIn: isIn ? qty : 0,
          quantityOut: isIn ? 0 : qty,
          balanceAfter: 0,
          note: adj.reason || adj.username || "",
        };
      }
    );

    // Unimos y ordenamos por fecha
    const allMovements = [...saleMovements, ...adjMovements].sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    );

    // Calculamos saldo inicial en base al stock actual
    const currentStock = Number(product.stock || 0);
    const netDelta = allMovements.reduce(
      (acc, m) =>
        acc + Number(m.quantityIn || 0) - Number(m.quantityOut || 0),
      0
    );
    const initialBalance = currentStock - netDelta;

    // Recorremos para asignar balanceAfter
    let running = initialBalance;
    const movementsWithBalance: KardexMovement[] =
      allMovements.map((m) => {
        running =
          running +
          Number(m.quantityIn || 0) -
          Number(m.quantityOut || 0);
        return {
          ...m,
          balanceAfter: running,
        };
      });

    return NextResponse.json({
      product: {
        _id: product._id.toString(),
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category || "",
        cost: Number(product.cost || 0),
        priceRetail: Number(product.priceRetail || 0),
        stock: currentStock,
      },
      initialBalance,
      currentStock,
      movements: movementsWithBalance,
    });
  } catch (error: any) {
    console.error("Error en GET /api/inventory/kardex:", error);
    return NextResponse.json(
      {
        message: "Error al obtener kardex",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
