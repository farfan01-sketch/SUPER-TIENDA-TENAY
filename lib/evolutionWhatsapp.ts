type SendWhatsAppTextArgs = {
  to: string;
  text: string;
};

function normalizeMxPhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");

  if (digits.startsWith("52") && digits.length >= 12) {
    return digits;
  }

  if (digits.length === 10) {
    return `52${digits}`;
  }

  return digits;
}

export async function sendEvolutionWhatsAppText({
  to,
  text,
}: SendWhatsAppTextArgs) {
  const phone = normalizeMxPhone(to);

  const apiUrl = process.env.EVOLUTION_API_URL;
  const instance = process.env.EVOLUTION_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!apiUrl || !instance || !apiKey) {
    console.warn("[Evolution WhatsApp] Faltan variables de entorno");

    return {
      success: false,
      error: "Faltan variables de entorno",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    console.log("[Evolution WhatsApp] Enviando mensaje a:", phone);

    const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text,
      }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[Evolution WhatsApp] Error:", data);

      return {
        success: false,
        error: data,
      };
    }

    console.log("[Evolution WhatsApp] Mensaje enviado correctamente");

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error(
      "[Evolution WhatsApp] Falló sin romper flujo:",
      error?.message
    );

    return {
      success: false,
      error: error?.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}