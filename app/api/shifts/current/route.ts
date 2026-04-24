import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Shift } from "@/lib/models/Shift";
import { parseSessionCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
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

    // Buscar turno abierto del usuario
    const shift = await Shift.findOne({
      userId: session._id,
      status: "open",
    }).lean();

    if (!shift) {
      return NextResponse.json({
        hasOpenShift: false,
      });
    }

    return NextResponse.json({
      hasOpenShift: true,
      shift: {
        _id: shift._id.toString(),
        username: shift.username,
        initialCash: shift.initialCash,
        openedAt: shift.openedAt,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/shifts/current:", error);

    return NextResponse.json(
      {
        message: "Error al obtener turno actual",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}