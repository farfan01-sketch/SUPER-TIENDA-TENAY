import { connectDB } from "@/lib/db";
import { CustomerPayment } from "@/lib/models/CustomerPayment";
import { Customer } from "@/lib/models/Customer";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TicketAbonoPage({ params }: Props) {
  const { id } = await params;

  await connectDB();

  const paymentDoc = await CustomerPayment.findById(id).lean();
  if (!paymentDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="rounded-xl bg-white p-6 shadow-md text-center">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Abono no encontrado
          </h1>
          <p className="text-sm text-slate-600">
            Verifica el enlace o vuelve a intentarlo desde el
            módulo de clientes.
          </p>
        </div>
      </div>
    );
  }

  const customer = paymentDoc.customerId
    ? await Customer.findById(paymentDoc.customerId).lean()
    : null;

  const createdAt = paymentDoc.createdAt
    ? new Date(paymentDoc.createdAt)
    : new Date();

  const amount = Number(paymentDoc.amount || 0);
  const method = String(paymentDoc.method || "");
  const note = paymentDoc.note as string | undefined;

  const customerName =
    (customer?.name as string | undefined) || "Cliente";

  const formattedDate = createdAt.toLocaleDateString(
    "es-MX"
  );
  const formattedTime = createdAt.toLocaleTimeString(
    "es-MX",
    { hour: "2-digit", minute: "2-digit" }
  );

  function formatMoney(value: number) {
    return `$${value.toFixed(2)}`;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-md">
        <div className="flex flex-col items-center text-center">
          {/* Logo si existe */}
          <div className="mb-2">
            <img
              src="/uploads/logo.jpg"
              alt="Logo"
              className="h-16 object-contain mx-auto"
              onError={(e) => {
                // si no existe el logo, ocultar imagen
                (e.currentTarget as HTMLImageElement).style.display =
                  "none";
              }}
            />
          </div>

          <h1 className="text-base font-bold text-slate-900">
            Super Tienda Tenay
          </h1>
          <p className="text-[11px] text-slate-600">
            Sistema de crédito · Recibo de abono
          </p>

          <div className="mt-2 text-[11px] text-slate-600">
            <div>
              Fecha:{" "}
              <span className="font-semibold">
                {formattedDate}
              </span>
            </div>
            <div>
              Hora:{" "}
              <span className="font-semibold">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>

        <div className="my-3 border-t border-dashed border-slate-300" />

        {/* Datos de cliente */}
        <div className="text-[11px] text-slate-800 space-y-1">
          <div>
            Cliente:{" "}
            <span className="font-semibold">
              {customerName}
            </span>
          </div>
          {customer?.phone && (
            <div>
              Teléfono:{" "}
              <span>{customer.phone as string}</span>
            </div>
          )}
        </div>

        <div className="my-3 border-t border-dashed border-slate-300" />

        {/* Monto del abono */}
        <div className="space-y-1 text-[11px] text-slate-800">
          <div className="flex justify-between">
            <span>Monto del abono:</span>
            <span className="font-bold text-slate-900">
              {formatMoney(amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Forma de pago:</span>
            <span>{method}</span>
          </div>
          {note && (
            <div className="mt-2">
              <div className="text-[10px] text-slate-500">
                Nota:
              </div>
              <div className="text-[10px] text-slate-700">
                {note}
              </div>
            </div>
          )}
        </div>

        <div className="my-3 border-t border-dashed border-slate-300" />

        <div className="text-[10px] text-slate-500 text-center">
          Gracias por tu pago.
          <br />
          Conserva este comprobante como respaldo de tu abono.
        </div>

        {/* Botón de impresión */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.print();
              }
            }}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-slate-800"
          >
            Imprimir recibo
          </button>
        </div>
      </div>
    </div>
  );
}
