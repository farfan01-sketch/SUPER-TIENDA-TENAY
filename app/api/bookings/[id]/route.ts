import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Booking from "@/lib/models/Booking";

type Params = {
  params: { id: string };
};

// GET /api/bookings/:id (opcional, por si lo necesitas)
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();
    const booking = await Booking.findById(params.id);
    if (!booking) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(booking);
  } catch (err: any) {
    console.error("GET /api/bookings/:id error:", err);
    return NextResponse.json(
      { message: err.message || "Error al obtener la reserva" },
      { status: 500 }
    );
  }
}

// PATCH /api/bookings/:id -> actualizar (admin)
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
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
      status,
    } = body;

    const booking = await Booking.findById(params.id);
    if (!booking) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // Si cambió fecha u horario y no está cancelada, revisamos conflicto
    const newDate = date ?? booking.date;
    const newStart = startTime ?? booking.startTime;

    if (
      (newDate !== booking.date || newStart !== booking.startTime) &&
      status !== "cancelado"
    ) {
      const exists = await Booking.findOne({
        _id: { $ne: booking._id },
        date: newDate,
        startTime: newStart,
        status: { $ne: "cancelado" },
      });

      if (exists) {
        return NextResponse.json(
          { message: "Ya existe otra cita en ese horario." },
          { status: 409 }
        );
      }
    }

    if (date !== undefined) booking.date = date;
    if (startTime !== undefined) booking.startTime = startTime;
    if (endTime !== undefined) booking.endTime = endTime;
    if (serviceType !== undefined) booking.serviceType = serviceType;
    if (customerName !== undefined) booking.customerName = customerName;
    if (customerPhone !== undefined) booking.customerPhone = customerPhone;
    if (notes !== undefined) booking.notes = notes;
    if (status !== undefined) booking.status = status;

    await booking.save();

    return NextResponse.json({
      message: "Reserva actualizada",
      booking,
    });
  } catch (err: any) {
    console.error("PATCH /api/bookings/:id error:", err);
    return NextResponse.json(
      { message: err.message || "Error al actualizar la reserva" },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/:id -> opcional
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();
    const booking = await Booking.findByIdAndDelete(params.id);
    if (!booking) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Reserva eliminada" });
  } catch (err: any) {
    console.error("DELETE /api/bookings/:id error:", err);
    return NextResponse.json(
      { message: err.message || "Error al eliminar la reserva" },
      { status: 500 }
    );
  }
}
