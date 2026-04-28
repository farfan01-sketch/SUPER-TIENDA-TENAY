import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Customer } from "@/lib/models/Customer";
import { parseSessionCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const filter: any = {};

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [{ name: regex }, { phone: regex }];
    }

    const customers = await Customer.find(filter)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(customers);
  } catch (error: any) {
    console.error("Error GET customers:", error);
    return NextResponse.json(
      { message: "Error al obtener clientes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);
    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const {
      name,
      phone,
      email,
      address,
      notes,
      creditLimit,
      creditDays,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const customer = await Customer.create({
      name: name.trim(),
      phone,
      email,
      address,
      notes,
      creditLimit: Number(creditLimit || 0),
      creditDays: Number(creditDays || 0),
      currentBalance: 0,
      isActive: true,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error("Error POST customers:", error);
    return NextResponse.json(
      { message: "Error al crear cliente" },
      { status: 500 }
    );
  }
}

// 🔥 EDITAR CLIENTE
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);
    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const {
      _id,
      name,
      phone,
      email,
      address,
      notes,
      creditLimit,
      creditDays,
      isActive,
    } = body;

    if (!_id) {
      return NextResponse.json(
        { message: "ID requerido" },
        { status: 400 }
      );
    }

    const updated = await Customer.findByIdAndUpdate(
      _id,
      {
        name,
        phone,
        email,
        address,
        notes,
        creditLimit: Number(creditLimit || 0),
        creditDays: Number(creditDays || 0),
        isActive: Boolean(isActive),
      },
      { new: true }
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error PUT customers:", error);
    return NextResponse.json(
      { message: "Error al actualizar cliente" },
      { status: 500 }
    );
  }
}

// 🔥 ELIMINAR CLIENTE
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);
    if (!session) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID requerido" },
        { status: 400 }
      );
    }

    await Customer.findByIdAndDelete(id);

    return NextResponse.json({ message: "Cliente eliminado" });
  } catch (error: any) {
    console.error("Error DELETE customers:", error);
    return NextResponse.json(
      { message: "Error al eliminar cliente" },
      { status: 500 }
    );
  }
}