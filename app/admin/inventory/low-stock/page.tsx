"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type LowStockProduct = {
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
};

export default function LowStockInventoryPage() {
  const [items, setItems] = useState<LowStockProduct[]>([]);
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

      const res = await fetch("/api/inventory/low-stock");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message ||
            "No se pudo cargar el reporte de productos bajos en inventario"
        );
      }

      const data: LowStockProduct[] = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(
        e.message ||
          "Error al cargar productos bajos en inventario"
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
        (acc, p) => acc + Number(p.cost || 0) * Number(p.stock || 0),
        0
      ),
    [filtered]
  );

  const totalRetail = useMemo(
    () =>
      filtered.reduce(
        (acc, p) =>
          acc + Number(p.priceRetail || 0) * Number(p.stock || 0),
        0
      ),
    [filtered]
  );

  function formatMoney(value: number) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
                {/* Header */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Productos bajos en inventario
            </h1>
            <p className="text-sm text-slate-600">
              Lista de productos cuya existencia está por debajo de su
              inventario mínimo configurado.
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
              {loading ? "Actualizando..." : "Actualizar lista"}
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-md bg-red-100 border border-red-200 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Filtros / resumen */}
        <section className="rounded-xl bg-white p-4 shadow-md space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Buscar producto
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Filtra por nombre, departamento, SKU o código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 md:w-80 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <div className="text-slate-500">
                  Costo total (bajos)
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(totalCost)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <div className="text-slate-500">
                  Valor venta (bajos)
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(totalRetail)}
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Esta vista te ayuda a decidir qué productos requieren
            compra urgente. El inventario mínimo se configura en cada
            producto.
          </p>
        </section>

        {/* Tabla */}
        <section className="rounded-xl bg-white p-4 shadow-md">
          {loading && items.length === 0 ? (
            <p className="text-sm text-slate-500">
              Cargando información de inventario...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay productos por debajo del inventario mínimo con los
              filtros actuales.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-[11px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">
                      Código / CB
                    </th>
                    <th className="px-2 py-2 text-left">
                      Descripción
                    </th>
                    <th className="px-2 py-2 text-left">
                      Depto / Categoría
                    </th>
                    <th className="px-2 py-2 text-right">
                      Costo
                    </th>
                    <th className="px-2 py-2 text-right">
                      Precio venta
                    </th>
                    <th className="px-2 py-2 text-right">
                      Existencia
                    </th>
                    <th className="px-2 py-2 text-right">
                      Inv. mínimo
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
                        <span
                          className={
                            p.stock <= 0
                              ? "text-red-600 font-semibold"
                              : "text-slate-900"
                          }
                        >
                          {p.stock.toFixed(3).replace(/\.000$/, "")}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right align-top">
                        {p.minStock.toFixed(3).replace(/\.000$/, "")}
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
