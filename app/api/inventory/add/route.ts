import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { InventoryMovement } from "@/lib/models/InventoryMovement";
import { parseSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

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
      variantId,
      quantity,
      cost,
      priceRetail,
      priceWholesale,
      reason,
    } = body as {
      productId: string;
      variantId?: string;
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

    const product: any = await Product.findById(productId);

    if (!product) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    let previousStock = 0;
    let newStock = 0;

    if (variantId) {
      const variant = (product.variants || []).find(
        (v: any) => v._id?.toString() === variantId
      );

      if (!variant) {
        return NextResponse.json(
          { message: "Variante no encontrada" },
          { status: 404 }
        );
      }

      previousStock = Number(variant.stock || 0);
      newStock = previousStock + Number(quantity);

      variant.stock = newStock;

      if (typeof cost === "number" && !Number.isNaN(cost)) {
        variant.cost = cost;
      }

      if (typeof priceRetail === "number" && !Number.isNaN(priceRetail)) {
        variant.priceRetail = priceRetail;
      }

      if (
        typeof priceWholesale === "number" &&
        !Number.isNaN(priceWholesale)
      ) {
        variant.priceWholesale = priceWholesale;
      }

      await product.save();

      const movement = await InventoryMovement.create({
        product: product._id,
        variantId,
        type: "entrada",
        quantity,
        previousStock,
        newStock,
        cost: Number(variant.cost || cost || 0),
        priceRetail: Number(variant.priceRetail || priceRetail || 0),
        priceWholesale: Number(
          variant.priceWholesale || priceWholesale || 0
        ),
        reason:
          reason ||
          `Entrada de inventario para variante de ${product.name}`,
        createdById: session._id,
        createdByName: session.username,
      });

      return NextResponse.json(
        {
          message: "Inventario de variante agregado correctamente",
          product: {
            _id: product._id.toString(),
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            stock: Number(product.stock || 0),
            variants: product.variants,
          },
          variant: {
            _id: variant._id.toString(),
            stock: variant.stock,
            cost: variant.cost,
            priceRetail: variant.priceRetail,
            priceWholesale: variant.priceWholesale,
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
    }

    previousStock = Number(product.stock || 0);
    newStock = previousStock + Number(quantity);

    if (typeof cost === "number" && !Number.isNaN(cost)) {
      product.cost = cost;
    }

    if (typeof priceRetail === "number" && !Number.isNaN(priceRetail)) {
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
          variants: product.variants || [],
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