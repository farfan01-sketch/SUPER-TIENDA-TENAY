import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { InventoryMovement } from "@/lib/models/InventoryMovement";
import { parseSessionCookie } from "@/lib/auth";
import mongoose from "mongoose";

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
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const skuOrBarcode = searchParams.get("skuOrBarcode");

    if (!productId && !skuOrBarcode) {
      return NextResponse.json(
        { message: "Debes enviar productId o skuOrBarcode como parámetro" },
        { status: 400 }
      );
    }

    let product: any = null;

    if (productId && mongoose.isValidObjectId(productId)) {
      product = await Product.findById(productId).lean();
    } else if (skuOrBarcode) {
      product = await Product.findOne({
        $or: [{ sku: skuOrBarcode }, { barcode: skuOrBarcode }],
      }).lean();
    }

    if (!product) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const movements = await InventoryMovement.find({
      product: product._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    const formattedMovements = movements.map((m: any) => {
      const qty = Math.abs(Number(m.quantity || 0));

      const isIn =
        m.type === "entrada" ||
        m.type === "devolucion" ||
        m.type === "cancelacion" ||
        (m.type === "ajuste" && Number(m.quantity || 0) > 0);

      const isOut =
        m.type === "venta" ||
        m.type === "salida" ||
        (m.type === "ajuste" && Number(m.quantity || 0) < 0);

      return {
        date: (m.createdAt || new Date()).toISOString(),
        type: String(m.type || "").toUpperCase(),
        reference: m.referenceId || "",
        quantityIn: isIn ? qty : 0,
        quantityOut: isOut ? qty : 0,
        balanceAfter: Number(m.newStock || 0),
        note: m.reason || "",
        createdByName: m.createdByName || "",
      };
    });

    const currentStock = Number(product.stock || 0);
    const initialBalance =
      formattedMovements.length > 0
        ? Number(movements[0].previousStock || 0)
        : currentStock;

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
      movements: formattedMovements,
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