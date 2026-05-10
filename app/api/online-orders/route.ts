import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OnlineOrder } from "@/models/OnlineOrder";
import { sendEvolutionWhatsAppText } from "@/lib/evolutionWhatsapp";

type OnlineOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

function formatProducts(items: OnlineOrderItem[]) {
  return items
    .map(
      (item) =>
        `- ${item.quantity} x ${item.name} = $${Number(
          item.subtotal || 0
        ).toFixed(2)}`
    )
    .join("\n");
}

async function sendOnlineOrderWhatsApps(order: any) {
  const adminPhone = process.env.ADMIN_WHATSAPP || "529712316195";
  const productos = formatProducts(order.items);

  const clienteMsg = `Hola ${order.customerName}, gracias por tu pedido.
Pedido #${order.folio}
Productos:
${productos}
Total: $${Number(order.totalApprox || 0).toFixed(2)}
En breve te contactaremos para confirmar pago y entrega.`;

  const adminMsg = `🛒 NUEVO PEDIDO EN LÍNEA
Cliente: ${order.customerName}
Teléfono: ${order.customerPhone}
Dirección: ${order.customerAddress || "No especificada"}
Productos:
${productos}
Total: $${Number(order.totalApprox || 0).toFixed(2)}`;

  await sendEvolutionWhatsAppText({
    to: order.customerPhone,
    text: clienteMsg,
  });

  await sendEvolutionWhatsAppText({
    to: adminPhone,
    text: adminMsg,
  });
}

export async function GET() {
  try {
    await connectDB();

    const orders = await OnlineOrder.find({
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = orders.map((order: any) => ({
      id: order.folio,
      createdAt: order.createdAt,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      customerEmail: order.customerEmail,
      items: order.items,
      totalApprox: order.totalApprox,
      status: order.status,
      linkedSaleId: order.linkedSaleId,
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error("Error en GET /api/online-orders:", err);

    return NextResponse.json(
      { message: "Error al cargar pedidos en línea" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);

    console.log("ONLINE ORDER BODY recibido:", body);

    if (!body) {
      return NextResponse.json(
        { message: "Cuerpo de la solicitud inválido" },
        { status: 400 }
      );
    }

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

    const rawItems = body.items || body.cart || body.products || [];

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
            "El pedido no contiene productos válidos.",
        },
        { status: 400 }
      );
    }

    const items: OnlineOrderItem[] = rawItems
      .map((it: any) => {
        const productId = it.productId || it._id || it.id || "";
        const name = it.name || it.productName || "";
        const quantity = Number(it.quantity || 1);
        const price = Number(it.price) || Number(it.priceRetail) || 0;
        const subtotal = Number(it.subtotal) || quantity * price;

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
            "No se pudieron mapear productos del pedido.",
        },
        { status: 400 }
      );
    }

    const totalApprox =
      typeof body.total === "number"
        ? Number(body.total)
        : items.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);

    const folio = `WEB-${Date.now()}`;

    const newOrder = await OnlineOrder.create({
      folio,
      customerName,
      customerPhone,
      customerAddress,
      customerEmail,
      items,
      totalApprox,
      status: "pending",
    });

    try {
      await sendOnlineOrderWhatsApps(newOrder);
    } catch (waError) {
      console.error(
        "[WhatsApp Pedido] Falló WhatsApp, pero el pedido quedó guardado:",
        waError
      );
    }

    return NextResponse.json(
      {
        message: "Pedido en línea creado correctamente",
        order: {
          id: newOrder.folio,
          createdAt: newOrder.createdAt,
          customerName: newOrder.customerName,
          customerPhone: newOrder.customerPhone,
          customerAddress: newOrder.customerAddress,
          customerEmail: newOrder.customerEmail,
          items: newOrder.items,
          totalApprox: newOrder.totalApprox,
          status: newOrder.status,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error en POST /api/online-orders:", err);

    return NextResponse.json(
      {
        message: "Error interno al crear pedido en línea",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);

    if (!body || !body.id) {
      return NextResponse.json(
        { message: "Falta id del pedido para actualizar" },
        { status: 400 }
      );
    }

    const order = await OnlineOrder.findOne({ folio: body.id });

    if (!order) {
      return NextResponse.json(
        { message: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    if (body.status) {
      order.status = body.status;
    }

    if (body.linkedSaleId) {
      order.linkedSaleId = body.linkedSaleId;
    }

    await order.save();

    return NextResponse.json(
      {
        message: "Pedido actualizado correctamente",
        order,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error en PATCH /api/online-orders:", err);

    return NextResponse.json(
      {
        message: "Error interno al actualizar pedido",
      },
      { status: 500 }
    );
  }
}