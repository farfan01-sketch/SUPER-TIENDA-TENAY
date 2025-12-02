import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { InventoryMovement } from "@/lib/models/InventoryMovement";
import { parseSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // 🔐 Validar sesión y permisos (manejo de inventario → canManageProducts)
    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);
    if (!session || !session.permissions?.canManageProducts) {
      return NextResponse.json(
        { message: "No autorizado para modificar inventario" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      productId,
      quantity,
      cost,
      priceRetail,
      priceWholesale,
      reason,
    } = body as {
      productId: string;
      quantity: number;
      cost: number;
      priceRetail: number;
      priceWholesale?: number;
      reason?: string;
    };

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        {
          message:
            "Producto y cantidad (> 0) son obligatorios para agregar inventario",
        },
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
    const newStock = previousStock + Number(quantity);

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

    // Registrar movimiento de inventario
    const movement = await InventoryMovement.create({
      product: product._id,
      type: "entrada",
      quantity,
      previousStock,
      newStock,
      cost: product.cost,
      priceRetail: product.priceRetail,
      priceWholesale: product.priceWholesale,
      reason: reason || "Entrada de inventario",
      createdById: session._id,
      createdByName: session.username,
    });

    return NextResponse.json(
      {
        message: "Inventario agregado correctamente",
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
    console.error("Error en POST /api/inventory/add:", error);
    return NextResponse.json(
      {
        message: "Error al agregar inventario",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
