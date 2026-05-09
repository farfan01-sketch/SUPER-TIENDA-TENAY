import { NextRequest, NextResponse } from "next/server";
import { sendEvolutionWhatsAppText } from "@/lib/evolutionWhatsapp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const to = body?.to || "";
    const message = body?.message || "";

    const customerPhone = body?.customerPhone || "";
    const customerName = body?.customerName || "Cliente";

    if (!to || !message) {
      return NextResponse.json(
        { error: "Faltan 'to' o 'message' en el cuerpo" },
        { status: 400 }
      );
    }

    // =========================
    // MENSAJE AL ADMIN
    // =========================
    const adminResult = await sendEvolutionWhatsAppText({
      to,
      text: message,
    });

    // =========================
    // MENSAJE AL CLIENTE
    // =========================
    if (customerPhone) {
      const customerMessage = `Hola ${customerName} 👋

Gracias por tu pedido en Cosmetic Tenay 💄

Tu pedido fue recibido correctamente y en breve te contactaremos para confirmar disponibilidad, pago y entrega.

¡Gracias por tu compra! ✨`;

      await sendEvolutionWhatsAppText({
        to: customerPhone,
        text: customerMessage,
      });
    }

    if (!adminResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo enviar WhatsApp",
          details: adminResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "evolution-api",
    });
  } catch (err: any) {
    console.error("[send-order Evolution] Error interno:", err);

    return NextResponse.json(
      {
        error: "Error interno",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}