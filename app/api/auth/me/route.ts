import { NextRequest, NextResponse } from "next/server";
import { parseSessionCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);

    if (!session) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        _id: session._id,
        username: session.username,
        role: session.role,
        permissions: session.permissions,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/auth/me:", error);
    return NextResponse.json(
      {
        message: "Error al obtener usuario actual",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
