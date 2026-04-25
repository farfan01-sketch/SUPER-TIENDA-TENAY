"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TotalsByMethod = {
  [method: string]: {
    total: number;
    count: number;
  };
};

type CashCut = {
  _id: string;
  folio: string;
  username?: string;
  rangeStart: string;
  rangeEnd: string;
  openingAmount?: number;
  closingAmount?: number;
  expectedCash?: number;
  difference?: number;
  totalSales?: number;
  totalCost?: number;
  profit?: number;
  salesCount?: number;
  cancelledSalesCount?: number;
  cancelledSalesTotal?: number;
  totalsByMethod?: TotalsByMethod;
  notes?: string;
  createdAt: string;
};

export default function CashCutPage() {
  const [cuts, setCuts] = useState<CashCut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatMoney(value?: number) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function resultText(diff?: number) {
    const n = Number(diff || 0);
    if (n > 0) return "Sobrante";
    if (n < 0) return "Faltante";
    return "Exacto";
  }

  function resultColor(diff?: number) {
    const n = Number(diff || 0);
    if (n > 0) return "text-emerald-700";
    if (n < 0) return "text-red-700";
    return "text-slate-700";
  }

  async function loadCuts() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/cashcuts", {
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "No se pudieron cargar cortes de caja"
        );
      }

      const data = await res.json();
      setCuts(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar cortes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCuts();
  }, []);

  const lastCut = cuts[0];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Corte de caja
            </h1>
            <p className="text-sm text-slate-600">
              Consulta cortes generados al cerrar turno.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
              Super Tienda Tenay POS
            </span>
            <Link
              href="/pos"
              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-slate-800"
            >
              Ir al POS
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-100 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Último corte generado
          </h2>

          {!lastCut ? (
            <p className="text-sm text-slate-500">
              Aún no hay cortes de caja registrados.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold">Folio:</span>
                <span>{lastCut.folio}</span>
              </div>

              <div className="flex justify-between">
                <span>Cajero:</span>
                <span>{lastCut.username || "-"}</span>
              </div>

              <div className="flex justify-between">
                <span>Inicio turno:</span>
                <span className="text-right">
                  {new Date(lastCut.rangeStart).toLocaleString("es-MX")}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Cierre turno:</span>
                <span className="text-right">
                  {new Date(lastCut.rangeEnd).toLocaleString("es-MX")}
                </span>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              <div className="flex justify-between">
                <span>Fondo inicial:</span>
                <span>{formatMoney(lastCut.openingAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span>Efectivo final contado:</span>
                <span>{formatMoney(lastCut.closingAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span>Efectivo esperado:</span>
                <span>{formatMoney(lastCut.expectedCash)}</span>
              </div>

              <div
                className={`flex justify-between font-bold ${resultColor(
                  lastCut.difference
                )}`}
              >
                <span>Diferencia:</span>
                <span>
                  {formatMoney(lastCut.difference)} ·{" "}
                  {resultText(lastCut.difference)}
                </span>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              <div className="flex justify-between font-semibold">
                <span>Total ventas:</span>
                <span>{formatMoney(lastCut.totalSales)}</span>
              </div>

              <div className="flex justify-between">
                <span>Costo estimado:</span>
                <span>{formatMoney(lastCut.totalCost)}</span>
              </div>

              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Ganancia / utilidad:</span>
                <span>{formatMoney(lastCut.profit)}</span>
              </div>

              <div className="flex justify-between">
                <span>Ventas incluidas:</span>
                <span>{Number(lastCut.salesCount || 0)}</span>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              <div>
                <div className="mb-1 font-semibold">Formas de pago</div>
                <div className="space-y-1">
                  {Object.entries(lastCut.totalsByMethod || {}).map(
                    ([method, info]) => (
                      <div className="flex justify-between" key={method}>
                        <span>
                          {method} ({info.count})
                        </span>
                        <span>{formatMoney(info.total)}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-3">
                <Link
                  href={`/corte/${lastCut._id}`}
                  target="_blank"
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-slate-800"
                >
                  Ver / Reimprimir ticket
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Historial de cortes
            </h2>
            {loading && (
              <span className="text-[11px] text-slate-500">Cargando...</span>
            )}
          </div>

          {cuts.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay cortes registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">Folio</th>
                    <th className="px-2 py-2 text-left">Periodo</th>
                    <th className="px-2 py-2 text-right">Ventas</th>
                    <th className="px-2 py-2 text-right">Utilidad</th>
                    <th className="px-2 py-2 text-right">Diferencia</th>
                    <th className="px-2 py-2 text-center">Tickets</th>
                    <th className="px-2 py-2 text-left">Cajero</th>
                    <th className="px-2 py-2 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {cuts.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-2 py-2 font-semibold">{c.folio}</td>

                      <td className="px-2 py-2">
                        <div>{new Date(c.rangeStart).toLocaleString("es-MX")}</div>
                        <div className="text-[10px] text-slate-500">
                          a {new Date(c.rangeEnd).toLocaleString("es-MX")}
                        </div>
                      </td>

                      <td className="px-2 py-2 text-right">
                        {formatMoney(c.totalSales)}
                      </td>

                      <td className="px-2 py-2 text-right text-emerald-700">
                        {formatMoney(c.profit)}
                      </td>

                      <td
                        className={`px-2 py-2 text-right font-semibold ${resultColor(
                          c.difference
                        )}`}
                      >
                        {formatMoney(c.difference)}
                        <div className="text-[10px]">
                          {resultText(c.difference)}
                        </div>
                      </td>

                      <td className="px-2 py-2 text-center">
                        {Number(c.salesCount || 0)}
                      </td>

                      <td className="px-2 py-2">{c.username || "-"}</td>

                      <td className="px-2 py-2 text-right">
                        <Link
                          href={`/corte/${c._id}`}
                          target="_blank"
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-semibold text-white shadow hover:bg-slate-800"
                        >
                          Ticket
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}