import { connectDB } from "@/lib/db";
import { CashCut } from "@/lib/models/CashCut";
import { Config } from "@/lib/models/Config";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

function money(value: any) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function safeDate(value: any) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-MX");
}

export default async function CashCutTicketPage({ params }: Props) {
  await connectDB();

  const { id } = await params;

  const cut: any = await CashCut.findById(id).lean();
  if (!cut) return notFound();

  const config: any =
    (await Config.findOne({ singletonKey: "main" }).lean()) || {
      storeName: "Super Tienda Tenay",
      logoPath: "/uploads/logo.jpg",
      ticketFooter: "Gracias por su compra.",
    };

  const createdAt = cut.createdAt ? new Date(cut.createdAt) : new Date();

  const dateStr = createdAt.toLocaleDateString("es-MX", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });

  const timeStr = createdAt.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalSales = Number(cut.totalSales || 0);
  const totalDiscounts = Number(cut.totalDiscounts || 0);

  const returnsCount = Number(cut.returnsCount || 0);
  const returnsTotal = Number(cut.returnsTotal || 0);
  const returnsCost = Number(cut.returnsCost || 0);

  const cancelledSalesCount = Number(cut.cancelledSalesCount || 0);
  const cancelledSalesTotal = Number(cut.cancelledSalesTotal || 0);

  const netSales =
    cut.netSales != null
      ? Number(cut.netSales || 0)
      : totalSales - totalDiscounts - returnsTotal;

  const totalCost = Number(cut.totalCost || 0);
  const profit = Number(cut.profit || 0);

  const saleCount =
    cut.salesCount != null
      ? Number(cut.salesCount || 0)
      : Number(cut.saleCount || 0);

  const openingAmount = Number(cut.openingAmount || 0);
  const closingAmount = Number(cut.closingAmount || 0);
  const expectedCash = Number(cut.expectedCash || 0);
  const difference = Number(cut.difference || 0);

  const resultText =
    difference > 0 ? "SOBRANTE" : difference < 0 ? "FALTANTE" : "EXACTO";

  const resultColor =
    difference > 0
      ? "text-emerald-700"
      : difference < 0
      ? "text-red-700"
      : "text-slate-700";

  const payments: { method: string; amount: number }[] =
    Array.isArray(cut.payments) && cut.payments.length > 0
      ? cut.payments
      : Object.entries(cut.totalsByMethod || {}).map(([method, info]: any) => ({
          method,
          amount: Number(info?.total || 0),
        }));

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-md p-4 text-xs text-slate-900">
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
            <div className="text-[10px] leading-tight">{config.address}</div>
          )}

          {(config.phone || config.taxId) && (
            <div className="text-[10px]">
              {config.phone && <>Tel: {config.phone} </>}
              {config.taxId && <> · RFC: {config.taxId}</>}
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-slate-300 my-2" />

        <div className="text-center text-[11px] font-semibold mb-1">
          CORTE DE CAJA
        </div>

        <div className="flex justify-between text-[11px] mb-1">
          <span>Folio corte:</span>
          <span>{cut.folio}</span>
        </div>

        <div className="flex justify-between text-[11px] mb-1">
          <span>Fecha corte:</span>
          <span>
            {dateStr} {timeStr}
          </span>
        </div>

        <div className="flex justify-between text-[11px] mb-1">
          <span>Periodo ventas:</span>
          <span className="text-right">
            {safeDate(cut.rangeStart)} - {safeDate(cut.rangeEnd)}
          </span>
        </div>

        <div className="flex justify-between text-[11px] mb-1">
          <span>Cajero / Usuario:</span>
          <span>{cut.username || "-"}</span>
        </div>

        <div className="border-t border-dashed border-slate-300 my-2" />

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Fondo inicial:</span>
            <span>{money(openingAmount)}</span>
          </div>

          <div className="flex justify-between">
            <span>Efectivo final contado:</span>
            <span>{money(closingAmount)}</span>
          </div>

          <div className="flex justify-between">
            <span>Efectivo esperado:</span>
            <span>{money(expectedCash)}</span>
          </div>

          <div className={`flex justify-between font-bold ${resultColor}`}>
            <span>Diferencia:</span>
            <span>
              {money(difference)} · {resultText}
            </span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 my-2" />

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Ventas bruto:</span>
            <span>{money(totalSales)}</span>
          </div>

          <div className="flex justify-between">
            <span>Descuentos:</span>
            <span>-{money(totalDiscounts)}</span>
          </div>

          <div className="flex justify-between text-red-700">
            <span>Devoluciones:</span>
            <span>-{money(returnsTotal)}</span>
          </div>

          <div className="flex justify-between font-semibold">
            <span>Ventas netas:</span>
            <span>{money(netSales)}</span>
          </div>

          <div className="flex justify-between">
            <span>Costo estimado:</span>
            <span>{money(totalCost)}</span>
          </div>

          {returnsCost > 0 && (
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Costo devuelto descontado:</span>
              <span>{money(returnsCost)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold text-emerald-700">
            <span>Utilidad estimada:</span>
            <span>{money(profit)}</span>
          </div>

          <div className="flex justify-between">
            <span>Ventas incluidas:</span>
            <span>{saleCount}</span>
          </div>

          <div className="flex justify-between">
            <span>Devoluciones realizadas:</span>
            <span>{returnsCount}</span>
          </div>

          <div className="flex justify-between">
            <span>Cancelaciones:</span>
            <span>
              {cancelledSalesCount} · {money(cancelledSalesTotal)}
            </span>
          </div>
        </div>

        {payments.length > 0 && (
          <>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <div className="text-[11px] font-semibold mb-1">
              Desglose por forma de pago
            </div>

            <div className="space-y-1 text-[11px]">
              {payments.map((p, idx) => (
                <div className="flex justify-between" key={idx}>
                  <span>{p.method}</span>
                  <span>{money(p.amount)}</span>
                </div>
              ))}
            </div>

            {returnsTotal > 0 && (
              <div className="mt-1 flex justify-between text-[11px] font-semibold text-red-700">
                <span>Salida por devolución:</span>
                <span>-{money(returnsTotal)}</span>
              </div>
            )}
          </>
        )}

        {cut.notes && String(cut.notes).trim() && (
          <>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <div className="text-[10px]">
              <span className="font-semibold">Notas:</span> {cut.notes}
            </div>
          </>
        )}

        <div className="border-t border-dashed border-slate-300 my-2" />

        <div className="text-center text-[10px] leading-tight">
          {config.ticketFooter || "Gracias por su compra."}
        </div>
      </div>
    </div>
  );
}