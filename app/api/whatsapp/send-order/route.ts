import { NextResponse } from "next/server";

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const token = process.env.WHATSAPP_TOKEN;

export async function POST(req: Request) {
  try {
    if (!phoneNumberId || !token) {
      console.error("Falta configuración de WhatsApp API");
      return NextResponse.json(
        { error: "WhatsApp API no configurada" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { to, message } = body as { to?: string; message?: string };

    if (!to || !message) {
      return NextResponse.json(
        { error: "Faltan 'to' o 'message' en el cuerpo" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to, // número en formato 52XXXXXXXXXX
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Error al enviar WhatsApp:", res.status, data);
      return NextResponse.json(
        { error: "Error al enviar mensaje a WhatsApp", details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("Error interno WhatsApp:", err);
    return NextResponse.json(
      { error: "Error interno en el servidor" },
      { status: 500 }
    );
  }
}
