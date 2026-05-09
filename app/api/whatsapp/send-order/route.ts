import { NextRequest, NextResponse } from "next/server";
import { sendEvolutionWhatsAppText } from "@/lib/evolutionWhatsapp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const to = body?.to || "";
    const message = body?.message || "";

    if (!to || !message) {
      return NextResponse.json(
        { error: "Faltan 'to' o 'message' en el cuerpo" },
        { status: 400 }
      );
    }

    const result = await sendEvolutionWhatsAppText({
      to,
      text: message,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo enviar WhatsApp por Evolution API",
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "evolution-api",
      data: result.data,
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