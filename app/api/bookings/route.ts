import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";     // 👈 usa tu helper existente
import Booking from "@/lib/models/Booking"; // 👈 modelo que creamos

// GET /api/bookings?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const query: any = {};
    if (date) {
      query.date = date; // guardamos date como string, así que filtramos directo
    }

    const bookings = await Booking.find(query)
      .sort({ date: 1, startTime: 1 })
      .lean();

    return NextResponse.json(bookings);
  } catch (err: any) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json(
      { message: err.message || "Error al obtener reservas" },
      { status: 500 }
    );
  }
}

// POST /api/bookings  -> crear reserva (pantalla de cliente)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      date,
      startTime,
      endTime,
      serviceType,
      customerName,
      customerPhone,
      notes,
    } = body;

    if (
      !date ||
      !startTime ||
      !endTime ||
      !serviceType ||
      !customerName ||
      !customerPhone
    ) {
      return NextResponse.json(
        { message: "Faltan datos obligatorios." },
        { status: 400 }
      );
    }

    // Verificar que no haya una reserva activa en el mismo slot
    const exists = await Booking.findOne({
      date,
      startTime,
      status: { $ne: "cancelado" },
    });

    if (exists) {
      return NextResponse.json(
        {
          message: "Ya existe una cita reservada en ese horario.",
        },
        { status: 409 }
      );
    }

    const booking = await Booking.create({
      date,
      startTime,
      endTime,
      serviceType,
      customerName,
      customerPhone,
      notes,
      status: "reservado",
    });

    return NextResponse.json(
      {
        message: "Cita creada correctamente",
        booking,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json(
      { message: err.message || "Error al crear la cita" },
      { status: 500 }
    );
  }
}
