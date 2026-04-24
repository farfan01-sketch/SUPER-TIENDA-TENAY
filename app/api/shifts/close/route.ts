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

    const { finalCash } = await req.json();

    if (finalCash == null || isNaN(finalCash)) {
      return NextResponse.json(
        { message: "El monto final es obligatorio" },
        { status: 400 }
      );
    }

    // Buscar turno abierto
    const shift = await Shift.findOne({
      userId: session._id,
      status: "open",
    });

    if (!shift) {
      return NextResponse.json(
        { message: "No tienes un turno abierto" },
        { status: 400 }
      );
    }

    // Cerrar turno
    shift.finalCash = Number(finalCash);
    shift.closedAt = new Date();
    shift.status = "closed";

    await shift.save();

    return NextResponse.json({
      message: "Turno cerrado correctamente",
      shift: {
        _id: shift._id.toString(),
        initialCash: shift.initialCash,
        finalCash: shift.finalCash,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
      },
    });
  } catch (error: any) {
    console.error("Error en POST /api/shifts/close:", error);

    return NextResponse.json(
      {
        message: "Error al cerrar turno",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}