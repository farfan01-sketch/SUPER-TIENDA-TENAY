import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const token = process.env.WHATSAPP_TOKEN;

function normalizeMxPhone(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";

  // Si ya viene con 52 o 521 lo dejamos
  if (digits.startsWith("521") && digits.length >= 13) return digits;
  if (digits.startsWith("52") && digits.length >= 12) return digits;

  // Si viene 10 dígitos, asumimos MX y agregamos 52
  if (digits.length === 10) return `52${digits}`;

  return digits;
}

export async function POST(req: NextRequest) {
  try {
    if (!phoneNumberId || !token) {
      return NextResponse.json(
        {
          error: "WhatsApp API no configurada",
          hasPhoneNumberId: Boolean(phoneNumberId),
          hasToken: Boolean(token),
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const toRaw = body?.to || "";
    const message = body?.message || "";

    if (!toRaw || !message) {
      return NextResponse.json(
        { error: "Faltan 'to' o 'message' en el cuerpo" },
        { status: 400 }
      );
    }

    const to = normalizeMxPhone(toRaw);
    if (!to) {
      return NextResponse.json(
        { error: "Teléfono inválido en 'to'" },
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
          to,
          type: "text",
          text: { preview_url: false, body: message },
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Error al enviar mensaje a WhatsApp",
          status: res.status,
          details: data,
          toNormalized: to,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, toNormalized: to, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error interno", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
