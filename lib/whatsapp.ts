import fetch from "node-fetch";

type SendWhatsAppTextArgs = {
  to: string; // formato internacional: 52 + 10 dígitos (MX)
  text: string;
};

function normalizeMxPhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  // Si ya viene con 52...
  if (digits.startsWith("52") && digits.length >= 12) return digits;
  // Si viene de 10 dígitos MX
  if (digits.length === 10) return `52${digits}`;
  // Si viene raro, lo regresamos igual para no romper
  return digits;
}

export async function sendWhatsAppText({ to, text }: SendWhatsAppTextArgs) {
  const phone = normalizeMxPhone(to);

  const token = process.env.WHATSAPP_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;

  if (!token || !phoneNumberId) {
    throw new Error("Faltan variables WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID");
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: text },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Error enviando WhatsApp");
  }
  return data;
}
