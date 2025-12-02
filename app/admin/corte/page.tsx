"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

type PaymentSummary = {
  method: string;
  amount: number;
};

type CashCut = {
  _id: string;
  folio: string;
  rangeStart: string;
  rangeEnd: string;
  totalSales?: number;
  totalDiscounts?: number;
  netSales?: number;
  totalCost?: number;
  profit?: number;
  payments: PaymentSummary[];
  saleCount?: number;
  username?: string;
  notes?: string;
  createdAt: string;
};

export default function CashCutPage() {
  const [cuts, setCuts] = useState<CashCut[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function loadCuts() {
    try {
      setLoading(true);
      clearMessages();
      const res = await fetch("/api/cashcuts");
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

  async function handleGenerateCut(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    try {
      setGenerating(true);
      const res = await fetch("/api/cashcuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Error al generar corte");
      }

      setSuccess(`Corte generado: ${data.cut?.folio || "SIN FOLIO"}`);
      setNotes("");
      await loadCuts();
    } catch (e: any) {
      setError(e.message || "Error al generar corte");
    } finally {
      setGenerating(false);
    }
  }

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
              Genera cortes por rango automático (desde el último corte hasta
              ahora) y consulta el historial.
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
          <div className="rounded-md bg-red-100 border border-red-200 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-emerald-100 border border-emerald-200 px-4 py-2 text-xs text-emerald-800">
            {success}
          </div>
        )}

        {/* Panel de último corte y formulario */}
        <section className="grid gap-4 md:grid-cols-[2fr,1.4fr]">
          {/* Último corte */}
          <div className="rounded-xl bg-white p-4 shadow-md md:p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">
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
                  <span>Periodo:</span>
                  <span className="text-right">
                    {new Date(lastCut.rangeStart).toLocaleString("es-MX")}{" "}
                    &nbsp;–&nbsp;
                    {new Date(lastCut.rangeEnd).toLocaleString("es-MX")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas (bruto):</span>
                  <span>
                    $
                    {Number(lastCut.totalSales ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Descuentos:</span>
                  <span>
                    -
                    {Number(lastCut.totalDiscounts ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Ventas netas:</span>
                  <span>
                    $
                    {Number(lastCut.netSales ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Costo estimado:</span>
                  <span>
                    $
                    {Number(lastCut.totalCost ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>Utilidad:</span>
                  <span>
                    $
                    {Number(lastCut.profit ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-dashed border-slate-200 my-2" />

                <div>
                  <div className="font-semibold mb-1">Formas de pago</div>
                  <div className="space-y-1">
                    {(lastCut.payments || []).map((p, idx) => (
                      <div className="flex justify-between" key={idx}>
                        <span>{p.method}</span>
                        <span>${Number(p.amount ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 my-2" />

                <div className="flex justify-between">
                  <span>Ventas incluidas:</span>
                  <span>{Number(lastCut.saleCount ?? 0)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Generado por:</span>
                  <span>{lastCut.username || "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span>Fecha corte:</span>
                  <span>
                    {new Date(lastCut.createdAt).toLocaleString("es-MX")}
                  </span>
                </div>

                <div className="flex justify-end mt-3">
                  <Link
                    href={`/corte/${lastCut._id}`}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-slate-800"
                    target="_blank"
                  >
                    Ver / Reimprimir ticket
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Generar nuevo corte */}
          <div className="rounded-xl bg-white p-4 shadow-md md:p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">
              Generar nuevo corte
            </h2>
            <p className="text-[11px] text-slate-600 mb-3">
              El sistema tomará todas las ventas NO cortadas desde el último
              corte hasta este momento. Se guardará un resumen con totales,
              formas de pago y utilidad estimada.
            </p>

            <form onSubmit={handleGenerateCut} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Notas del corte (opcional)
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Corte de turno de la mañana, cajero Juan."
                />
              </div>
              <button
                type="submit"
                disabled={generating}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {generating ? "Generando corte..." : "Generar corte de caja"}
              </button>
            </form>
          </div>
        </section>

        {/* Historial de cortes */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Historial de cortes
            </h2>
            {loading && (
              <span className="text-[11px] text-slate-500">
                Cargando...
              </span>
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
                    <th className="px-2 py-2 text-right">Netas</th>
                    <th className="px-2 py-2 text-right">Utilidad</th>
                    <th className="px-2 py-2 text-center">Ventas</th>
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
                        <div>
                          {new Date(c.rangeStart).toLocaleString("es-MX")}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          a{" "}
                          {new Date(c.rangeEnd).toLocaleString("es-MX")}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        ${Number(c.netSales ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right text-emerald-700">
                        ${Number(c.profit ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {Number(c.saleCount ?? 0)}
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
