import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Booking from "@/lib/models/Booking";

// ✅ Next (en tu build) espera params como Promise
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: Ctx) {
  try {
    await connectDB();
    const { id } = await context.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { message: "Cita no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (err) {
    console.error("GET /api/bookings/[id] error:", err);
    return NextResponse.json(
      { message: "Error al cargar la cita" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    await connectDB();
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));

    // Permite ajustar campos típicos (seguro)
    const allowed: any = {};
    if (body.date) allowed.date = body.date;
    if (body.startTime) allowed.startTime = body.startTime;
    if (body.endTime) allowed.endTime = body.endTime;
    if (body.serviceType) allowed.serviceType = body.serviceType;
    if (body.customerName) allowed.customerName = body.customerName;
    if (body.customerPhone) allowed.customerPhone = body.customerPhone;
    if (typeof body.notes !== "undefined") allowed.notes = body.notes;

    // status: reservado | cancelado | confirmado (si lo manejas)
    if (body.status) allowed.status = body.status;

    const updated = await Booking.findByIdAndUpdate(id, allowed, {
      new: true,
    });

    if (!updated) {
      return NextResponse.json(
        { message: "Cita no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/bookings/[id] error:", err);
    return NextResponse.json(
      { message: "Error al actualizar la cita" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: Ctx) {
  try {
    await connectDB();
    const { id } = await context.params;

    const deleted = await Booking.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { message: "Cita no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Cita eliminada" });
  } catch (err) {
    console.error("DELETE /api/bookings/[id] error:", err);
    return NextResponse.json(
      { message: "Error al eliminar la cita" },
      { status: 500 }
    );
  }
}
