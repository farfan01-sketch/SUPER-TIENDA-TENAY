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
  productId?: string;
  variantId?: string;
  name: string;
  variantText?: string;
  quantity?: number;
  price?: number;
  cost?: number;
  subtotal?: number;
};

type Payment = {
  method: PaymentMethod;
  amount: number;
};

type Sale = {
  _id: string;
  folio?: string;
  total: number;
  status: "completed" | "cancelled";
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelReason?: string;
  payments?: Payment[];
  items?: SaleItem[];
};

type ReturnItemInput = {
  productId?: string;
  variantId?: string;
  name: string;
  variantText?: string;
  soldQuantity: number;
  quantity: number;
};

function labelPaymentMethod(method: PaymentMethod): string {
  const clean = String(method || "").toLowerCase().trim();

  if (clean === "efectivo") return "Efectivo";
  if (clean === "tarjeta_credito") return "Tarjeta crédito";
  if (clean === "tarjeta_debito") return "Tarjeta débito";
  if (clean === "transferencia") return "Transferencia";
  if (clean === "mercadopago") return "MercadoPago";
  if (clean === "credito" || clean === "crédito") return "Crédito";

  return String(method || "N/D");
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [returnSale, setReturnSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemInput[]>([]);
  const [returnReason, setReturnReason] = useState("Devolución parcial");

  const formatMoney = (value: number | undefined | null) => {
    const num = Number(value || 0);
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

      const res = await fetch("/api/sales", {
        cache: "no-store",
      });

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

    const folio = sale.folio || sale._id.slice(-6);

    const confirmMsg = `¿Seguro que quieres cancelar la venta ${folio}?

Esto hará una cancelación REAL:
- Regresa TODOS los productos al inventario.
- Si fue venta a crédito, descuenta el saldo del cliente.
- En el corte aparecerá como cancelación.`;

    if (!window.confirm(confirmMsg)) return;

    const reason = window.prompt(
      "Motivo de cancelación:",
      "Cancelación de venta"
    );

    if (reason === null) return;

    try {
      setCancelingId(sale._id);

      const res = await fetch(`/api/sales/${sale._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "No se pudo cancelar la venta");
      }

      setSuccess(
        "Venta cancelada correctamente. El inventario fue devuelto y se reflejará en el corte."
      );

      await loadSales();
    } catch (e: any) {
      setError(e.message || "Error al cancelar venta");
    } finally {
      setCancelingId(null);
    }
  }

  function openReturnModal(sale: Sale) {
    clearMessages();

    if (sale.status === "cancelled") {
      setError("No puedes hacer devolución de una venta cancelada");
      return;
    }

    const items = (sale.items || []).map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      variantText: item.variantText,
      soldQuantity: Number(item.quantity || 1),
      quantity: 0,
    }));

    setReturnSale(sale);
    setReturnItems(items);
    setReturnReason("Devolución parcial");
  }

  function closeReturnModal() {
    setReturnSale(null);
    setReturnItems([]);
    setReturnReason("Devolución parcial");
  }

  function updateReturnQuantity(index: number, value: number) {
    setReturnItems((prev) => {
      const copy = [...prev];
      const item = copy[index];

      const qty = Math.max(0, Math.min(Number(value || 0), item.soldQuantity));

      copy[index] = {
        ...item,
        quantity: qty,
      };

      return copy;
    });
  }

  async function handleReturnSubmit() {
    clearMessages();

    if (!returnSale) return;

    const itemsToReturn = returnItems
      .filter((item) => Number(item.quantity || 0) > 0)
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: Number(item.quantity || 0),
      }));

    if (itemsToReturn.length === 0) {
      setError("Selecciona al menos un producto para devolver");
      return;
    }

    try {
      setReturningId(returnSale._id);

      const res = await fetch(`/api/sales/${returnSale._id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToReturn,
          reason: returnReason || "Devolución parcial",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "No se pudo registrar la devolución");
      }

      setSuccess("Devolución parcial registrada correctamente");
      closeReturnModal();
      await loadSales();
    } catch (e: any) {
      setError(e.message || "Error al registrar devolución");
    } finally {
      setReturningId(null);
    }
  }

  const filteredSales = sales.filter((s) => {
    if (!search.trim()) return true;

    const term = search.toLowerCase();
    const folio = s.folio || `FA-${s._id.slice(-6).toUpperCase()}`;
    const dateStr = new Date(s.createdAt).toLocaleString("es-MX").toLowerCase();

    const itemsText =
      s.items
        ?.map((item) => `${item.name || ""} ${item.variantText || ""}`)
        .join(" ")
        .toLowerCase() || "";

    return (
      folio.toLowerCase().includes(term) ||
      dateStr.includes(term) ||
      itemsText.includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Historial de ventas
            </h1>
            <p className="text-sm text-slate-600">
              Consulta tickets, devoluciones parciales y cancelaciones reales.
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

        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Buscar por folio, fecha, producto o variante
              </label>
              <input
                type="text"
                placeholder="Ej: FA-000123, perfume, vainilla, 24/04/2026..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={loadSales}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800"
            >
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>

          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-100 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-100 px-4 py-2 text-xs text-emerald-800">
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
                        className="border-b border-slate-100 last:border-0 align-top"
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

                        <td className="px-2 py-2 text-right font-semibold">
                          {formatMoney(s.total)}
                        </td>

                        <td className="px-2 py-2">
                          <div className="max-w-xs text-[11px] text-slate-700">
                            {paymentsText}
                          </div>
                        </td>

                        <td className="px-2 py-2">
                          {isCancelled ? (
                            <span className="text-[11px] font-semibold text-red-700">
                              Cancelada
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              Completada
                            </span>
                          )}

                          {isCancelled &&
                            (s.cancellationReason || s.cancelReason) && (
                              <div className="text-[10px] text-slate-500">
                                Motivo:{" "}
                                {s.cancellationReason || s.cancelReason}
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
                                onClick={() => openReturnModal(s)}
                                className="rounded-md bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-amber-600"
                              >
                                Devolución
                              </button>
                            )}

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

      {returnSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Devolución parcial
                </h2>
                <p className="text-xs text-slate-500">
                  Venta: {returnSale.folio || returnSale._id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReturnModal}
                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-3 max-h-80 overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-600">
                  <tr>
                    <th className="px-2 py-2 text-left">Producto</th>
                    <th className="px-2 py-2 text-center">Vendidas</th>
                    <th className="px-2 py-2 text-center">Devolver</th>
                  </tr>
                </thead>

                <tbody>
                  {returnItems.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        <div className="font-semibold">{item.name}</div>
                        {item.variantText && (
                          <div className="text-[10px] text-slate-500">
                            {item.variantText}
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center">
                        {item.soldQuantity}
                      </td>

                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={item.soldQuantity}
                          value={item.quantity}
                          onChange={(e) =>
                            updateReturnQuantity(idx, Number(e.target.value))
                          }
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Motivo
              </label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeReturnModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleReturnSubmit}
                disabled={returningId === returnSale._id}
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-600 disabled:bg-slate-400"
              >
                {returningId === returnSale._id
                  ? "Procesando..."
                  : "Confirmar devolución"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}