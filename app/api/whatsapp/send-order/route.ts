import { NextRequest, NextResponse } from "next/server";
import { sendEvolutionWhatsAppText } from "@/lib/evolutionWhatsapp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
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

    const results: any = {
      admin: null,
      customer: null,
    };

    // Mensaje al administrador
    results.admin = await sendEvolutionWhatsAppText({
      to: adminPhone,
      text: adminMessage,
    });

    // Mensaje al cliente
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