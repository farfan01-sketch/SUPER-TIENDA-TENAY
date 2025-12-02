import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Customer } from "@/lib/models/Customer";
import { parseSessionCookie } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
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

    const { id } = await params;
    const body = await req.json();

    const {
      name,
      phone,
      email,
      address,
      notes,
      creditLimit,
      isActive,
    } = body as {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
      creditLimit?: number;
      isActive?: boolean;
    };

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (typeof name === "string") customer.name = name.trim();
    if (typeof phone === "string") customer.phone = phone;
    if (typeof email === "string") customer.email = email;
    if (typeof address === "string") customer.address = address;
    if (typeof notes === "string") customer.notes = notes;
    if (typeof creditLimit === "number") {
      customer.creditLimit = creditLimit;
    }
    if (typeof isActive === "boolean") {
      customer.isActive = isActive;
    }

    await customer.save();

    return NextResponse.json(customer);
  } catch (error: any) {
    console.error("Error en PUT /api/customers/[id]:", error);
    return NextResponse.json(
      {
        message: "Error al actualizar cliente",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
