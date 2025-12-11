import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Booking from "@/lib/models/Booking";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json(booking, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/bookings/[id] error:", err);
    return NextResponse.json(
      { message: err?.message || "Error al obtener cita" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));

    const allowed = [
      "date",
      "startTime",
      "endTime",
      "serviceType",
      "customerName",
      "customerPhone",
      "notes",
      "status",
    ] as const;

    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const updated = await Booking.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("PATCH /api/bookings/[id] error:", err);
    return NextResponse.json(
      { message: err?.message || "Error al actualizar cita" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const deleted = await Booking.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "Cita eliminada" }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/bookings/[id] error:", err);
    return NextResponse.json(
      { message: err?.message || "Error al eliminar cita" },
      { status: 500 }
    );
  }
}
