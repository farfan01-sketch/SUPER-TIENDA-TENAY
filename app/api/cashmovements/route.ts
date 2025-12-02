import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  CashMovement,
  CashMovementType,
} from "@/lib/models/CashMovement";
import { parseSessionCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const filter: any = {};
    if (type) {
      filter.type = type;
    }

    const movements = await CashMovement.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(movements);
  } catch (error: any) {
    console.error("Error en GET /api/cashmovements:", error);
    return NextResponse.json(
      {
        message:
          "Error al obtener movimientos de caja",
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
    const {
      type,
      amount,
      description,
    } = body as {
      type: CashMovementType;
      amount: number;
      description?: string;
    };

    if (!type) {
      return NextResponse.json(
        { message: "El tipo de movimiento es requerido" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          message:
            "El monto debe ser mayor a 0",
        },
        { status: 400 }
      );
    }

    const direction: "in" | "out" =
      type === "expense" ? "out" : "in";

    const movement = await CashMovement.create({
      type,
      direction,
      amount,
      description,
      userId: session._id,
      username: session.username,
    });

    return NextResponse.json(
      {
        message: "Movimiento registrado",
        movement,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en POST /api/cashmovements:", error);
    return NextResponse.json(
      {
        message:
          "Error al registrar movimiento de caja",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
