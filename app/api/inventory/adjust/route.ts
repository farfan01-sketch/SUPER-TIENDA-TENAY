import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { InventoryMovement } from "@/lib/models/InventoryMovement";
import { parseSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // 🔐 Permisos
    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);
    if (!session || !session.permissions?.canManageProducts) {
      return NextResponse.json(
        { message: "No autorizado para ajustar inventario" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      productId,
      delta, // puede ser positivo o negativo
      newStock: newStockFromClient,
      cost,
      priceRetail,
      priceWholesale,
      reason,
    } = body as {
      productId: string;
      delta?: number;
      newStock?: number;
      cost?: number;
      priceRetail?: number;
      priceWholesale?: number;
      reason?: string;
    };

    if (!productId) {
      return NextResponse.json(
        { message: "El producto es obligatorio" },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const previousStock = Number(product.stock || 0);

    let movementDelta: number | undefined = undefined;
    let newStock: number | undefined = undefined;

    // Si viene delta (±) lo usamos
    if (typeof delta === "number" && !Number.isNaN(delta) && delta !== 0) {
      movementDelta = delta;
      newStock = previousStock + delta;
    }
    // Si no, intentamos con newStock
    else if (
      typeof newStockFromClient === "number" &&
      !Number.isNaN(newStockFromClient)
    ) {
      newStock = newStockFromClient;
      movementDelta = newStockFromClient - previousStock;
      if (movementDelta === 0) {
        return NextResponse.json(
          {
            message:
              "La nueva cantidad es igual a la existencia actual, no hay nada que ajustar.",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          message:
            "Debes indicar un ajuste (+/-) o una nueva cantidad distinta a la actual.",
        },
        { status: 400 }
      );
    }

    if (newStock < 0) {
      return NextResponse.json(
        {
          message:
            "El ajuste dejaría el inventario en negativo. Verifica cantidades.",
        },
        { status: 400 }
      );
    }

    // Actualizar precios y existencia
    if (typeof cost === "number" && !Number.isNaN(cost)) {
      product.cost = cost;
    }
    if (
      typeof priceRetail === "number" &&
      !Number.isNaN(priceRetail)
    ) {
      product.priceRetail = priceRetail;
    }
    if (
      typeof priceWholesale === "number" &&
      !Number.isNaN(priceWholesale)
    ) {
      product.priceWholesale = priceWholesale;
    }
    product.stock = newStock;

    await product.save();

    // Registrar movimiento de inventario (ajuste)
    const movement = await InventoryMovement.create({
      product: product._id,
      type: "ajuste",
      quantity: movementDelta, // puede ser positivo o negativo
      previousStock,
      newStock,
      cost: product.cost,
      priceRetail: product.priceRetail,
      priceWholesale: product.priceWholesale,
      reason:
        reason ||
        "Ajuste de inventario desde pantalla Ajustar inventario",
      createdById: session._id,
      createdByName: session.username,
    });

    return NextResponse.json(
      {
        message: "Ajuste de inventario realizado correctamente",
        product: {
          _id: product._id.toString(),
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          stock: product.stock,
          cost: product.cost,
          priceRetail: product.priceRetail,
          priceWholesale: product.priceWholesale,
        },
        movement: {
          _id: movement._id.toString(),
          type: movement.type,
          quantity: movement.quantity,
          previousStock: movement.previousStock,
          newStock: movement.newStock,
          createdAt: movement.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en POST /api/inventory/adjust:", error);
    return NextResponse.json(
      {
        message: "Error al ajustar inventario",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
