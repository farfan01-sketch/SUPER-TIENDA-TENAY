import { connectDB } from "@/lib/db";
import { CashCut } from "@/lib/models/CashCut";
import { Config } from "@/lib/models/Config";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CashCutTicketPage({
  params,
}: Props) {
  await connectDB();

  const { id } = await params;

  const cut: any = await CashCut.findById(id).lean();
  if (!cut) return notFound();

  const config: any =
    (await Config.findOne({
      singletonKey: "main",
    }).lean()) ||
    {
      storeName: "Super Tienda Tenay",
      logoPath: "/uploads/logo.jpg",
      ticketFooter: "Gracias por su compra.",
    };

  const createdAt = cut.createdAt
    ? new Date(cut.createdAt)
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

  const payments: any[] = cut.payments || [];

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
            {new Date(
              cut.rangeStart
            ).toLocaleString("es-MX")}{" "}
            -{" "}
            {new Date(
              cut.rangeEnd
            ).toLocaleString("es-MX")}
          </span>
        </div>
        {cut.username && (
          <div className="flex justify-between text-[11px] mb-1">
            <span>Cajero / Usuario:</span>
            <span>{cut.username}</span>
          </div>
        )}

        <div className="border-t border-dashed border-slate-300 my-2" />

        {/* Totales */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Ventas bruto:</span>
            <span>
              ${Number(cut.totalSales).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Descuentos:</span>
            <span>
              -
              {Number(
                cut.totalDiscounts
              ).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Ventas netas:</span>
            <span>
              ${Number(cut.netSales).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Costo estimado:</span>
            <span>
              ${Number(cut.totalCost).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-emerald-700">
            <span>Utilidad estimada:</span>
            <span>
              ${Number(cut.profit).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Ventas incluidas:</span>
            <span>{cut.saleCount}</span>
          </div>
        </div>

        {/* Formas de pago */}
        {payments.length > 0 && (
          <>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <div className="text-[11px] font-semibold mb-1">
              Desglose por forma de pago
            </div>
            <div className="space-y-1 text-[11px]">
              {payments.map((p, idx) => (
                <div
                  className="flex justify-between"
                  key={idx}
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

        {/* Notas */}
        {cut.notes && cut.notes.trim() && (
          <>
            <div className="border-t border-dashed border-slate-300 my-2" />
            <div className="text-[10px]">
              <span className="font-semibold">
                Notas:
              </span>{" "}
              {cut.notes}
            </div>
          </>
        )}

        <div className="border-t border-dashed border-slate-300 my-2" />

        {/* Pie */}
        <div className="text-center text-[10px] leading-tight">
          {config.ticketFooter || "Gracias por su compra."}
        </div>
      </div>
    </div>
  );
}
