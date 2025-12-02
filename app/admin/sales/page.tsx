"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PaymentMethod =
  | "Efectivo"
  | "Tarjeta – Crédito"
  | "Tarjeta – Débito"
  | "Transferencia"
  | "MercadoPago"
  | "Crédito"
  | "Mixto"
  | string;

type SaleItem = {
  name: string;
};

type Payment = {
  method: PaymentMethod;
  amount: number;
};

type Sale = {
  _id: string;
  folio?: string;
  folioNumber?: number;
  total: number;
  status: "completed" | "cancelled";
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  payments?: Payment[];
  items?: SaleItem[];
};

function labelPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case "efectivo":
      return "Efectivo";
    case "tarjeta_credito":
      return "Tarjeta crédito";
    case "tarjeta_debito":
      return "Tarjeta débito";
    case "transferencia":
      return "Transferencia";
    case "mercadopago":
      return "MercadoPago";
    case "credito":
      return "Crédito";
    default:
      return method;
  }
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const formatMoney = (value: number | undefined | null) => {
    const num = value || 0;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    });
  };

  async function loadSales() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/sales");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudieron cargar las ventas");
      }
      const data = await res.json();
      setSales(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar ventas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function handleCancel(sale: Sale) {
    clearMessages();

    if (sale.status === "cancelled") {
      setError("La venta ya está cancelada");
      return;
    }

    const confirmMsg = `¿Seguro que quieres cancelar la venta con folio ${
      sale.folio || sale._id.slice(-6)
    }? Esto devolverá el inventario al stock.`;

    if (!window.confirm(confirmMsg)) return;

    const reason = window.prompt("Motivo de cancelación (opcional):", "");

    try {
      setCancelingId(sale._id);
      const res = await fetch(`/api/sales/${sale._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo cancelar la venta");
      }

      const data = await res.json();
      setSuccess("Venta cancelada correctamente.");

      // actualizar estado local
      setSales((prev) =>
        prev.map((s) =>
          s._id === sale._id
            ? {
                ...s,
                status: data.sale.status,
                cancelledAt: data.sale.cancelledAt,
                cancellationReason: data.sale.cancellationReason,
              }
            : s
        )
      );
    } catch (e: any) {
      setError(e.message || "Error al cancelar venta");
    } finally {
      setCancelingId(null);
    }
  }

  const filteredSales = sales.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const folio = s.folio || (s._id ? `FA-${s._id.slice(-6).toUpperCase()}` : "");
    const dateStr = new Date(s.createdAt).toLocaleString("es-MX").toLowerCase();
    const firstItem =
      s.items && s.items[0]?.name ? s.items[0].name.toLowerCase() : "";

    return (
      folio.toLowerCase().includes(term) ||
      dateStr.includes(term) ||
      firstItem.includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER CORRECTO */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Historial de ventas
            </h1>
            <p className="text-sm text-slate-600">
              Consulta tickets, formas de pago y cancela ventas si es necesario.
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

        {/* === AQUI CONTINÚA NORMAL: EL BLOQUE ROTO YA SE ELIMINÓ === */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Buscar por folio, fecha o producto
              </label>
              <input
                type="text"
                placeholder="Ej: FA-000123, 01/02/2025, labial rojo..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {loading && (
              <span className="text-xs text-slate-500">Cargando ventas...</span>
            )}
          </div>

          {error && (
            <div className="mb-3 rounded-md bg-red-100 px-4 py-2 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-3 rounded-md bg-emerald-100 px-4 py-2 text-xs text-emerald-800 border border-emerald-200">
              {success}
            </div>
          )}

          {filteredSales.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay ventas registradas o no hay resultados con ese filtro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-600">
                  <tr>
                    <th className="px-2 py-2 text-left">Folio</th>
                    <th className="px-2 py-2 text-left">Fecha</th>
                    <th className="px-2 py-2 text-right">Total</th>
                    <th className="px-2 py-2 text-left">Formas de pago</th>
                    <th className="px-2 py-2 text-left">Estado</th>
                    <th className="px-2 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((s) => {
                    const folio =
                      s.folio ||
                      (s._id ? `FA-${s._id.slice(-6).toUpperCase()}` : "");

                    const fecha = new Date(s.createdAt).toLocaleString("es-MX", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const paymentsText =
                      s.payments && s.payments.length > 0
                        ? s.payments
                            .map(
                              (p) =>
                                `${labelPaymentMethod(p.method)}: ${formatMoney(
                                  p.amount
                                )}`
                            )
                            .join(" · ")
                        : "N/D";

                    const isCancelled = s.status === "cancelled";

                    return (
                      <tr
                        key={s._id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-2 py-2">
                          <span className="font-semibold">{folio}</span>
                          {isCancelled && (
                            <span className="ml-1 rounded-full bg-red-100 px-2 py-[1px] text-[10px] font-semibold text-red-700">
                              CANCELADA
                            </span>
                          )}
                        </td>

                        <td className="px-2 py-2">
                          <div>{fecha}</div>
                          {isCancelled && s.cancelledAt && (
                            <div className="text-[10px] text-red-700">
                              Canc.:{" "}
                              {new Date(s.cancelledAt).toLocaleString("es-MX", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </td>

                        <td className="px-2 py-2 text-right">
                          {formatMoney(s.total)}
                        </td>

                        <td className="px-2 py-2">
                          <div className="max-w-xs text-[11px] text-slate-700">
                            {paymentsText}
                          </div>
                        </td>

                        <td className="px-2 py-2">
                          {isCancelled ? (
                            <span className="text-[11px] text-red-700">
                              Cancelada
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-700">
                              Completada
                            </span>
                          )}
                          {isCancelled && s.cancellationReason && (
                            <div className="text-[10px] text-slate-500">
                              Motivo: {s.cancellationReason}
                            </div>
                          )}
                        </td>

                        <td className="px-2 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                window.open(`/ticket/${s._id}`, "_blank")
                              }
                              className="rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white hover:bg-slate-700"
                            >
                              Ticket
                            </button>

                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleCancel(s)}
                                disabled={cancelingId === s._id}
                                className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-500 disabled:bg-slate-400"
                              >
                                {cancelingId === s._id
                                  ? "Cancelando..."
                                  : "Cancelar"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
