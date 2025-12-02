import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";
import { Config } from "@/lib/models/Config";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TicketPage({ params }: Props) {
  await connectDB();

  const { id } = await params;

  const sale: any = await Sale.findById(id).lean();
  if (!sale) {
    return notFound();
  }

  const config: any =
    (await Config.findOne({ singletonKey: "main" }).lean()) ||
    {
      storeName: "Super Tienda Tenay",
      logoPath: "/uploads/logo.jpg",
      ticketFooter: "Gracias por su compra.",
    };

  const createdAt = sale.createdAt
    ? new Date(sale.createdAt)
    : new Date();

  const dateStr = createdAt.toLocaleDateString("es-MX", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });

  const timeStr = createdAt.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const items: any[] = sale.items || [];
  const payments: any[] = sale.payments || [];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-md p-4 text-xs text-slate-900">
        {/* Encabezado con logo */}
        <div className="flex flex-col items-center text-center mb-2">
          {config.logoPath ? (
            <img
              src={config.logoPath}
              alt={config.storeName || "Logo tienda"}
              className="mb-2 max-h-20 w-auto object-contain"
            />
          ) : null}
          <div className="font-bold text-sm">
            {config.storeName || "Super Tienda Tenay"}
          </div>
          {config.address && (
            <div className="text-[10px] leading-tight">
              {config.address}
            </div>
          )}
          {(config.phone || config.taxId) && (
            <div className="text-[10px]">
              {config.phone && <>Tel: {config.phone} </>}
              {config.taxId && <> · RFC: {config.taxId}</>}
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-slate-300 my-2" />

        {/* Datos de la venta */}
        <div className="flex justify-between text-[11px] mb-1">
          <span>Folio:</span>
          <span className="font-semibold">
            {sale.folio || sale._id.toString()}
          </span>
        </div>
        <div className="flex justify-between text-[11px] mb-1">
          <span>Fecha:</span>
          <span>
            {dateStr} {timeStr}
          </span>
        </div>
        {sale.cashier && (
          <div className="flex justify-between text-[11px] mb-1">
            <span>Cajero:</span>
            <span>{sale.cashier}</span>
          </div>
        )}
        {sale.status && sale.status !== "completed" && (
          <div className="mt-1 text-[11px] font-semibold text-red-600 text-right">
            ESTADO: {String(sale.status).toUpperCase()}
          </div>
        )}

        <div className="border-t border-dashed border-slate-300 my-2" />

        {/* Productos */}
        <div className="mb-1 font-semibold text-[11px]">
          Detalle de venta
        </div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-1">Descripción</th>
              <th className="text-right py-1">Cant</th>
              <th className="text-right py-1">P. Unit</th>
              <th className="text-right py-1">Importe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-1 pr-1">
                  {item.name}
                  {item.variantText && (
                    <span className="block text-[9px] text-slate-500">
                      {item.variantText}
                    </span>
                  )}
                </td>
                <td className="py-1 text-right">
                  {item.quantity}
                </td>
                <td className="py-1 text-right">
                  ${Number(item.price).toFixed(2)}
                </td>
                <td className="py-1 text-right">
                  $
                  {Number(
                    item.subtotal ?? item.quantity * item.price
                  ).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-slate-300 my-2" />

        {/* Totales */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>
              $
              {Number(
                sale.subtotal ?? sale.total ?? 0
              ).toFixed(2)}
            </span>
          </div>
          {sale.discount && sale.discount > 0 && (
            <div className="flex justify-between">
              <span>Descuento:</span>
              <span>-${Number(sale.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-[12px]">
            <span>Total:</span>
            <span>${Number(sale.total ?? 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Pagos */}
        {payments.length > 0 && (
          <>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <div className="text-[11px] font-semibold mb-1">
              Formas de pago
            </div>
            <div className="space-y-1 text-[11px]">
              {payments.map((p, idx) => (
                <div
                  key={idx}
                  className="flex justify-between"
                >
                  <span>{p.method}</span>
                  <span>
                    ${Number(p.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-dashed border-slate-300 my-2" />

        {/* Pie de ticket */}
        <div className="text-center text-[10px] leading-tight">
          {config.ticketFooter || "Gracias por su compra."}
        </div>
      </div>
    </div>
  );
}
