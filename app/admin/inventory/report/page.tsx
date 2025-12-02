"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type InventoryItem = {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  cost: number;
  priceRetail: number;
  priceWholesale?: number;
  stock: number;
  minStock: number;
  valueCost: number;
  valueRetail: number;
  grossProfit: number;
};

export default function InventoryReportPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function clearMessages() {
    setError(null);
  }

  async function loadData() {
    try {
      setLoading(true);
      clearMessages();

      const res = await fetch("/api/inventory/report");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "No se pudo cargar el reporte de inventario"
        );
      }

      const data: InventoryItem[] = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(
        e.message || "Error al cargar el reporte de inventario"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const name = p.name.toLowerCase();
      const sku = p.sku?.toLowerCase() || "";
      const barcode = p.barcode?.toLowerCase() || "";
      const cat = p.category?.toLowerCase() || "";
      return (
        name.includes(q) ||
        sku.includes(q) ||
        barcode.includes(q) ||
        cat.includes(q)
      );
    });
  }, [items, search]);

  const totalCost = useMemo(
    () =>
      filtered.reduce(
        (acc, p) => acc + Number(p.valueCost || 0),
        0
      ),
    [filtered]
  );

  const totalRetail = useMemo(
    () =>
      filtered.reduce(
        (acc, p) => acc + Number(p.valueRetail || 0),
        0
      ),
    [filtered]
  );

  const totalProfit = useMemo(
    () =>
      filtered.reduce(
        (acc, p) => acc + Number(p.grossProfit || 0),
        0
      ),
    [filtered]
  );

  function formatMoney(value: number) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function formatQty(value: number) {
    // dejando 3 decimales por si manejas kg/litros
    return Number(value || 0)
      .toFixed(3)
      .replace(/\.000$/, "");
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
              {/* Header */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Reporte de inventario
            </h1>
            <p className="text-sm text-slate-600">
              Valor de inventario a costo y a precio de venta, con
              ganancia potencial.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
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
            <button
              type="button"
              onClick={loadData}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-500"
              disabled={loading}
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-md bg-red-100 border border-red-200 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Filtros + resumen */}
        <section className="rounded-xl bg-white p-4 shadow-md space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Buscar producto
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Nombre, categoría, SKU o código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 md:w-[420px] text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <div className="text-slate-500">
                  Costo total del inventario
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(totalCost)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <div className="text-slate-500">
                  Valor venta inventario
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(totalRetail)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <div className="text-slate-500">
                  Ganancia potencial
                </div>
                <div className="text-sm font-semibold text-emerald-700">
                  {formatMoney(totalProfit)}
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Las cantidades se calculan con base en el stock actual y los
            precios de cada producto. Útil para ver cuánto dinero tienes
            “en anaquel” a costo y a precio de venta.
          </p>
        </section>

        {/* Tabla */}
        <section className="rounded-xl bg-white p-4 shadow-md">
          {loading && items.length === 0 ? (
            <p className="text-sm text-slate-500">
              Cargando reporte de inventario...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay productos con los filtros actuales.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-[11px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">Código / CB</th>
                    <th className="px-2 py-2 text-left">Descripción</th>
                    <th className="px-2 py-2 text-left">Categoría</th>
                    <th className="px-2 py-2 text-right">Costo</th>
                    <th className="px-2 py-2 text-right">
                      Precio venta
                    </th>
                    <th className="px-2 py-2 text-right">Existencia</th>
                    <th className="px-2 py-2 text-right">
                      Inv. mínimo
                    </th>
                    <th className="px-2 py-2 text-right">
                      Valor a costo
                    </th>
                    <th className="px-2 py-2 text-right">
                      Valor a venta
                    </th>
                    <th className="px-2 py-2 text-right">
                      Ganancia pot.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p._id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-2 py-1 align-top">
                        <div>{p.barcode || p.sku}</div>
                        {p.sku && p.barcode && (
                          <div className="text-[10px] text-slate-500">
                            SKU: {p.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 align-top">
                        <div className="font-semibold">
                          {p.name}
                        </div>
                      </td>
                      <td className="px-2 py-1 align-top">
                        <div className="text-[10px] text-slate-600">
                          {p.category || "-"}
                        </div>
                      </td>
                      <td className="px-2 py-1 text-right align-top">
                        {formatMoney(p.cost)}
                      </td>
                      <td className="px-2 py-1 text-right align-top">
                        {formatMoney(p.priceRetail)}
                      </td>
                      <td className="px-2 py-1 text-right align-top">
                        {formatQty(p.stock)}
                      </td>
                      <td className="px-2 py-1 text-right align-top">
                        {formatQty(p.minStock)}
                      </td>
                      <td className="px-2 py-1 text-right align-top">
                        {formatMoney(p.valueCost)}
                      </td>
                      <td className="px-2 py-1 text-right align-top">
                        {formatMoney(p.valueRetail)}
                      </td>
                      <td className="px-2 py-1 text-right align-top">
                        <span
                          className={
                            p.grossProfit >= 0
                              ? "text-emerald-700"
                              : "text-red-600"
                          }
                        >
                          {formatMoney(p.grossProfit)}
                        </span>
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
