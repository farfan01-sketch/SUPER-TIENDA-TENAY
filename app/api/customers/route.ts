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
    console.error("Error en GET /api/customers:", error);
    return NextResponse.json(
      {
        message: "Error al obtener clientes",
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
    if (!session) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, phone, email, address, notes, creditLimit } =
      body as {
        name: string;
        phone?: string;
        email?: string;
        address?: string;
        notes?: string;
        creditLimit?: number;
      };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "El nombre del cliente es obligatorio" },
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
      currentBalance: 0,
      isActive: true,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/customers:", error);
    return NextResponse.json(
      {
        message: "Error al crear cliente",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
