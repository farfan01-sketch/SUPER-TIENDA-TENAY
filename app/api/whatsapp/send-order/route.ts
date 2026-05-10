import { NextRequest, NextResponse } from "next/server";
import { sendEvolutionWhatsAppText } from "@/lib/evolutionWhatsapp";
import { connectDB } from "@/lib/db";
import { OnlineOrder } from "@/models/OnlineOrder";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));

    const adminPhone = body?.to || "";
    const adminMessage = body?.message || "";

    const customerPhone = body?.customerPhone || "";
    const customerName = body?.customerName || "Cliente";

    if (!adminPhone || !adminMessage) {
      return NextResponse.json(
        { error: "Faltan 'to' o 'message' en el cuerpo" },
        { status: 400 }
      );
    }

    let onlineOrder = null;

    if (customerPhone && customerName) {
      onlineOrder = await OnlineOrder.create({
        folio: `WEB-${Date.now()}`,
        customerName,
        customerPhone,
        customerAddress: body?.customerAddress || body?.address || "",
        customerEmail: body?.customerEmail || body?.email || "",
        items: Array.isArray(body?.items)
          ? body.items.map((item: any) => ({
              productId: item.productId || item._id || item.id || "SIN-ID",
              name: item.name || item.productName || "Producto",
              quantity: Number(item.quantity || 1),
              price: Number(item.price || item.priceRetail || 0),
              subtotal:
                Number(item.subtotal) ||
                Number(item.quantity || 1) *
                  Number(item.price || item.priceRetail || 0),
            }))
          : [],
        totalApprox: Number(body?.total || body?.totalApprox || 0),
        status: "pending",
      });
    }

    const results: any = {
      admin: null,
      customer: null,
      onlineOrder: onlineOrder
        ? {
            id: onlineOrder.folio,
            status: onlineOrder.status,
          }
        : null,
    };

    results.admin = await sendEvolutionWhatsAppText({
      to: adminPhone,
      text: adminMessage,
    });

    if (customerPhone) {
      const customerMessage = `Hola ${customerName} 👋

Gracias por tu pedido en Cosmetic Tenay 💄

Hemos recibido tu pedido con el siguiente detalle:

${adminMessage}

En breve te contactaremos para confirmar disponibilidad, forma de pago y tiempo de entrega.

¡Gracias por comprar en Cosmetic Tenay! ✨`;

      results.customer = await sendEvolutionWhatsAppText({
        to: customerPhone,
        text: customerMessage,
      });
    }

    return NextResponse.json({
      ok: true,
      provider: "evolution-api",
      orderSaved: !!onlineOrder,
      orderId: onlineOrder?.folio || null,
      results,
    });
  } catch (err: any) {
    console.error("[send-order Evolution] Error interno:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "Error interno",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}