import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/Product";

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find().sort({ name: 1 }).lean();
    return NextResponse.json(products);
  } catch (error: any) {
    console.error("Error en GET /api/products:", error);
    return NextResponse.json(
      {
        message: "Error al obtener productos",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const product = await Product.create(body);
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/products:", error);
    return NextResponse.json(
      {
        message: "Error al crear producto",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Falta el id del producto" },
        { status: 400 }
      );
    }

    const data = await req.json();

    const updated = await Product.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!updated) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error en PUT /api/products:", error);
    return NextResponse.json(
      {
        message: "Error al actualizar producto",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Falta el id del producto" },
        { status: 400 }
      );
    }

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Producto eliminado" });
  } catch (error: any) {
    console.error("Error en DELETE /api/products:", error);
    return NextResponse.json(
      {
        message: "Error al eliminar producto",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
