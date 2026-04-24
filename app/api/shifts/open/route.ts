import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Shift } from "@/lib/models/Shift";
import { parseSessionCookie } from "@/lib/auth";

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

    const { initialCash } = await req.json();

    if (initialCash == null || isNaN(initialCash)) {
      return NextResponse.json(
        { message: "La provisión inicial es obligatoria" },
        { status: 400 }
      );
    }

    // Verificar si ya tiene turno abierto
    const existingShift = await Shift.findOne({
      userId: session._id,
      status: "open",
    });

    if (existingShift) {
      return NextResponse.json(
        { message: "Ya tienes un turno abierto" },
        { status: 400 }
      );
    }

    // Crear turno
    const shift = await Shift.create({
      userId: session._id,
      username: session.username,
      initialCash: Number(initialCash),
      status: "open",
      openedAt: new Date(),
    });

    return NextResponse.json({
      message: "Turno iniciado correctamente",
      shift: {
        _id: shift._id.toString(),
        initialCash: shift.initialCash,
        openedAt: shift.openedAt,
      },
    });
  } catch (error: any) {
    console.error("Error en POST /api/shifts/open:", error);

    return NextResponse.json(
      {
        message: "Error al iniciar turno",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}