import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Booking from "@/lib/models/Booking";

// GET /api/bookings?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { message: "Falta el parámetro date (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const bookings = await Booking.find({ date }).sort({ startTime: 1 }).lean();
    return NextResponse.json(bookings, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json(
      { message: err?.message || "Error al cargar citas" },
      { status: 500 }
    );
  }
}

// POST /api/bookings
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
        { message: "Faltan datos obligatorios para crear la cita" },
        { status: 400 }
      );
    }

    const exists = await Booking.findOne({ date, startTime, status: "reservado" }).lean();
    if (exists) {
      return NextResponse.json({ message: "Ese horario ya está ocupado" }, { status: 409 });
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

    return NextResponse.json(created.toObject(), { status: 201 });
  } catch (err: any) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json(
      { message: err?.message || "Error al crear la cita" },
      { status: 500 }
    );
  }
}
