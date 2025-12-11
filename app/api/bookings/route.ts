import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Booking from "@/lib/models/Booking";

function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  // "HH:MM" comparables como string si van con 0 padding
  return aStart < bEnd && bStart < aEnd;
}

// GET /api/bookings?date=YYYY-MM-DD  -> lista por fecha
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const filter: any = {};
    if (date) filter.date = date;

    const bookings = await Booking.find(filter).sort({
      date: 1,
      startTime: 1,
      createdAt: -1,
    });

    return NextResponse.json(bookings);
  } catch (err) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json(
      { message: "Error al cargar citas" },
      { status: 500 }
    );
  }
}

// POST /api/bookings -> crear cita
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));

    const {
      date,
      startTime,
      endTime,
      serviceType,
      customerName,
      customerPhone,
      notes,
    } = body || {};

    if (!date || !startTime || !endTime || !serviceType || !customerName || !customerPhone) {
      return NextResponse.json(
        { message: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    // revisar choque con otra cita reservada
    const sameDay = await Booking.find({ date, status: "reservado" });

    const conflict = sameDay.some((b: any) =>
      overlap(startTime, endTime, b.startTime, b.endTime)
    );

    if (conflict) {
      return NextResponse.json(
        { message: "Ese horario ya está ocupado" },
        { status: 409 }
      );
    }

    const created = await Booking.create({
      date,
      startTime,
      endTime,
      serviceType,
      customerName,
      customerPhone,
      notes: notes || "",
      status: "reservado",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json(
      { message: "Error al crear la cita" },
      { status: 500 }
    );
  }
}
