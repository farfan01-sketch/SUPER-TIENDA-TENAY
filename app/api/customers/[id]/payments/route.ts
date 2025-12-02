import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Customer } from "@/lib/models/Customer";
import { CustomerPayment } from "@/lib/models/CustomerPayment";
import { CashMovement } from "@/lib/models/CashMovement";
import { parseSessionCookie } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

// GET: historial de pagos de un cliente
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();

      const { id } = await params;

    const payments = await CustomerPayment.find({
      customerId: id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error(
      "Error en GET /api/customers/[id]/payments:",
      error
    );
    return NextResponse.json(
      {
        message:
          "Error al obtener pagos del cliente",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// POST: registrar abono
export async function POST(req: NextRequest, { params }: Params) {
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

    const { id } = await params;
    const body = await req.json();
    const {
      amount,
      method,
      note,
      createCashMovement,
    } = body as {
      amount: number;
      method: string;
      note?: string;
      createCashMovement?: boolean;
    };

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          message:
            "El monto del abono debe ser mayor a 0",
        },
        { status: 400 }
      );
    }

    if (!method || !method.trim()) {
      return NextResponse.json(
        {
          message:
            "La forma de pago es requerida (Efectivo, Transferencia, etc.)",
        },
        { status: 400 }
      );
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Registrar pago
    const payment = await CustomerPayment.create({
      customerId: customer._id,
      amount,
      method,
      note,
      userId: session._id,
      username: session.username,
    });

    // Actualizar saldo del cliente
    customer.currentBalance =
      Number(customer.currentBalance || 0) - amount;
    if (customer.currentBalance < 0) {
      customer.currentBalance = 0;
    }
    await customer.save();

    // Movimiento de caja opcional (ej: abono en efectivo)
    if (createCashMovement) {
      await CashMovement.create({
        type: "customerPayment",
        direction: "in",
        amount,
        description:
          note ||
          `Abono de cliente ${customer.name} (${method})`,
        userId: session._id,
        username: session.username,
        customerId: customer._id,
      });
    }

    return NextResponse.json(
      {
        message: "Abono registrado",
        payment,
        customer,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "Error en POST /api/customers/[id]/payments:",
      error
    );
    return NextResponse.json(
      {
        message: "Error al registrar abono",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
