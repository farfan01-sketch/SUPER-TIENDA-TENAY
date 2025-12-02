"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type OnlineOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type OnlineOrder = {
  id: string;
  createdAt: string;

  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerEmail?: string;

  items: OnlineOrderItem[];
  totalApprox: number;

  status: "pending" | "processed" | "cancelled";
};

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function clearMessages() {
    setError(null);
  }

  async function loadOrders() {
    try {
      setLoading(true);
      clearMessages();

      const res = await fetch("/api/online-orders");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "No se pudieron cargar los pedidos en línea"
        );
      }

      const data: OnlineOrder[] = await res.json();
      setOrders(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar pedidos en línea");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((o) => {
      const name = o.customerName?.toLowerCase() || "";
      const phone = o.customerPhone?.toLowerCase() || "";
      const id = o.id?.toLowerCase() || "";
      return (
        name.includes(q) ||
        phone.includes(q) ||
        id.includes(q)
      );
    });
  }, [orders, search]);

  function formatMoney(value: number) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  function handleOpenInPos(order: OnlineOrder) {
    if (typeof window === "undefined") return;

    const payload = {
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      customerEmail: order.customerEmail,
      items: order.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
      })),
    };

    try {
      window.localStorage.setItem(
        "posOnlineOrderDraft",
        JSON.stringify(payload)
      );
      // Ir al POS
      window.location.href = "/pos";
    } catch (e) {
      console.error("Error guardando borrador en localStorage:", e);
      alert("No se pudo preparar el pedido para el POS.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* HEADER */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Pedidos en línea
            </h1>
            <p className="text-sm text-slate-600">
              Pedidos que llegan desde la tienda en línea para procesarlos en el POS.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-pink-200 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
              Super Tienda Tenay – Web
            </span>
            <Link
              href="/pos"
              className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow hover:bg-slate-800"
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

        {/* FILTROS */}
        <section className="rounded-xl bg-white p-4 shadow-md space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Buscar pedido
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Filtra por nombre, teléfono o folio WEB-..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-slate-500 md:text-right">
              <p>
                Mostrando{" "}
                <span className="font-semibold text-slate-900">
                  {filtered.length}
                </span>{" "}
                pedido(s)
              </p>
              {loading && (
                <p className="text-[11px] text-slate-400">
                  Cargando pedidos...
                </p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Haz clic en “Abrir en POS” para llevar el pedido al punto de venta y cobrarlo.
          </p>
        </section>

        {/* LISTA */}
        <section className="rounded-xl bg-white p-4 shadow-md">
          {loading && filtered.length === 0 ? (
            <p className="text-sm text-slate-500">
              Cargando pedidos en línea...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay pedidos con los filtros actuales.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => (
                <article
                  key={order.id}
                  className="rounded-lg border border-slate-200 p-3 text-xs flex flex-col gap-2 md:flex-row md:items-start md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2 py-[2px] text-[10px] font-semibold text-white">
                        {order.id}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatDate(order.createdAt)}
                      </span>
                      <span
                        className={
                          order.status === "pending"
                            ? "rounded-full bg-amber-100 px-2 py-[2px] text-[10px] font-semibold text-amber-800"
                            : order.status === "processed"
                            ? "rounded-full bg-emerald-100 px-2 py-[2px] text-[10px] font-semibold text-emerald-800"
                            : "rounded-full bg-red-100 px-2 py-[2px] text-[10px] font-semibold text-red-700"
                        }
                      >
                        {order.status === "pending"
                          ? "Pendiente"
                          : order.status === "processed"
                          ? "Procesado"
                          : "Cancelado"}
                      </span>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-900">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        WhatsApp: {order.customerPhone}
                      </div>
                      {order.customerAddress && (
                        <div className="text-[11px] text-slate-600">
                          Dirección: {order.customerAddress}
                        </div>
                      )}
                      {order.customerEmail && (
                        <div className="text-[11px] text-slate-600">
                          Correo: {order.customerEmail}
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600">
                      {order.items.length} producto(s) · Total aprox:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatMoney(order.totalApprox)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => handleOpenInPos(order)}
                      className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-emerald-700"
                    >
                      Abrir en POS
                    </button>
                    <details className="w-full text-[11px] text-slate-600">
                      <summary className="cursor-pointer select-none text-slate-500">
                        Ver detalle de productos
                      </summary>
                      <ul className="mt-1 list-disc pl-4 space-y-0.5">
                        {order.items.map((it, idx) => (
                          <li key={idx}>
                            {it.name} x{it.quantity} – {formatMoney(it.price)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
