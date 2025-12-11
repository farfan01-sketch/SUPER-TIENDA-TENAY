import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Booking from "@/lib/models/Booking";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const booking = await Booking.findById(id).lean();
    if (!booking) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json(booking, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/bookings/[id] error:", err);
    return NextResponse.json(
      { message: err?.message || "Error al cargar la cita" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));

    const allowed: any = {};
    if (body.date) allowed.date = body.date;
    if (body.startTime) allowed.startTime = body.startTime;
    if (body.endTime) allowed.endTime = body.endTime;
    if (body.serviceType) allowed.serviceType = body.serviceType;
    if (body.customerName) allowed.customerName = body.customerName;
    if (body.customerPhone) allowed.customerPhone = body.customerPhone;
    if (typeof body.notes === "string") allowed.notes = body.notes;
    if (body.status) allowed.status = body.status;

    const updated = await Booking.findByIdAndUpdate(id, allowed, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("PATCH /api/bookings/[id] error:", err);
    return NextResponse.json(
      { message: err?.message || "Error al actualizar la cita" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const deleted = await Booking.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ message: "Cita no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "Cita eliminada" }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/bookings/[id] error:", err);
    return NextResponse.json(
      { message: err?.message || "Error al eliminar la cita" },
      { status: 500 }
    );
  }
}
