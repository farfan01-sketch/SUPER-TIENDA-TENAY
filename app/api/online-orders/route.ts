import { NextResponse } from "next/server";

type OnlineOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type OnlineOrder = {
  id: string;
  createdAt: string;

  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerEmail?: string;

  items: OnlineOrderItem[];
  totalApprox: number;

  status: "pending" | "processed" | "cancelled";

  // opcional: para ligar con la venta del POS
  linkedSaleId?: string;
};

// 🧠 almacenamiento en memoria (solo dev)
const ONLINE_ORDERS: OnlineOrder[] = [];

export async function GET() {
  return NextResponse.json(ONLINE_ORDERS, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    console.log("ONLINE ORDER BODY recibido:", body);

    if (!body) {
      return NextResponse.json(
        { message: "Cuerpo de la solicitud inválido" },
        { status: 400 }
      );
    }

    // Campos del cliente
    const customerName =
      body.customerName ||
      body.name ||
      body.clienteNombre ||
      body.customer?.name;

    const customerPhone =
      body.customerPhone ||
      body.phone ||
      body.whatsapp ||
      body.clienteTelefono ||
      body.customer?.phone;

    const customerAddress =
      body.customerAddress ||
      body.address ||
      body.direccion ||
      body.customer?.address;

    const customerEmail =
      body.customerEmail ||
      body.email ||
      body.correo ||
      body.customer?.email;

    // items puede venir como items, cart o products
    const rawItems =
      body.items || body.cart || body.products || [];

    if (!customerName || !customerPhone) {
      return NextResponse.json(
        {
          message:
            "Faltan datos del cliente (nombre y WhatsApp son obligatorios)",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        {
          message:
            "El pedido no contiene productos válidos (items/cart/products vacío).",
        },
        { status: 400 }
      );
    }

    const items: OnlineOrderItem[] = rawItems
      .map((it: any) => {
        const productId =
          it.productId || it._id || it.id || "";
        const name = it.name || it.productName || "";
        const quantity = Number(it.quantity || 1);
        const price =
          Number(it.price) ||
          Number(it.priceRetail) ||
          0;
        const subtotal =
          Number(it.subtotal) || quantity * price;

        if (!productId || !name) return null;

        return {
          productId,
          name,
          quantity,
          price,
          subtotal,
        };
      })
      .filter(Boolean) as OnlineOrderItem[];

    if (items.length === 0) {
      return NextResponse.json(
        {
          message:
            "No se pudieron mapear productos del pedido. Revisa la estructura enviada.",
        },
        { status: 400 }
      );
    }

    const totalApprox =
      typeof body.total === "number"
        ? Number(body.total)
        : items.reduce(
            (acc, it) =>
              acc + Number(it.subtotal || 0),
            0
          );

    const newOrder: OnlineOrder = {
      id: `WEB-${Date.now()}`,
      createdAt:
        body.createdAt ||
        new Date().toISOString(),
      customerName,
      customerPhone,
      customerAddress,
      customerEmail,
      items,
      totalApprox,
      status: "pending",
    };

    ONLINE_ORDERS.unshift(newOrder);

    console.log(
      "ONLINE ORDER guardado en memoria:",
      newOrder.id
    );

    return NextResponse.json(
      {
        message: "Pedido en línea creado correctamente",
        order: newOrder,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error(
      "Error en POST /api/online-orders:",
      err
    );
    return NextResponse.json(
      {
        message:
          "Error interno al crear pedido en línea",
      },
      { status: 500 }
    );
  }
}

// 🔹 NUEVO: actualizar estado de un pedido (por ejemplo a "processed")
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    console.log("PATCH /api/online-orders BODY:", body);

    if (!body || !body.id) {
      return NextResponse.json(
        { message: "Falta id del pedido para actualizar" },
        { status: 400 }
      );
    }

    const {
      id,
      status,
      linkedSaleId,
    }: {
      id: string;
      status?: OnlineOrder["status"];
      linkedSaleId?: string;
    } = body;

    const order = ONLINE_ORDERS.find(
      (o) => o.id === id
    );

    if (!order) {
      return NextResponse.json(
        { message: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    if (status) {
      order.status = status;
    }

    if (linkedSaleId) {
      order.linkedSaleId = linkedSaleId;
    }

    return NextResponse.json(
      {
        message: "Pedido actualizado correctamente",
        order,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(
      "Error en PATCH /api/online-orders:",
      err
    );
    return NextResponse.json(
      {
        message:
          "Error interno al actualizar pedido",
      },
      { status: 500 }
    );
  }
}
