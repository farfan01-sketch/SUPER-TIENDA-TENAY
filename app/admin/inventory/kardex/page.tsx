"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type KardexProduct = {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  cost: number;
  priceRetail: number;
  stock: number;
};

type KardexMovement = {
  date: string;
  type: string;
  reference?: string;
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  note?: string;
};

type KardexResponse = {
  product: KardexProduct;
  initialBalance: number;
  currentStock: number;
  movements: KardexMovement[];
};

export default function KardexPage() {
  const [searchCode, setSearchCode] = useState("");
  const [data, setData] = useState<KardexResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearMessages() {
    setError(null);
  }

  function formatMoney(value: number) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function formatQty(value: number) {
    return Number(value || 0)
      .toFixed(3)
      .replace(/\.000$/, "");
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("es-MX", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    setData(null);

    const code = searchCode.trim();
    if (!code) {
      setError("Captura SKU o código de barras del producto");
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        skuOrBarcode: code,
      }).toString();

      const res = await fetch(`/api/inventory/kardex?${params}`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          json?.message || "No se pudo obtener el kardex"
        );
      }

      setData(json);
    } catch (e: any) {
      setError(e.message || "Error al obtener kardex");
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    if (!data) return null;
    const movements = data.movements || [];

    const totalIn = movements.reduce(
      (acc, m) => acc + Number(m.quantityIn || 0),
      0
    );
    const totalOut = movements.reduce(
      (acc, m) => acc + Number(m.quantityOut || 0),
      0
    );

    return {
      totalIn,
      totalOut,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Header */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
  <div>
    <h1 className="text-2xl font-bold text-slate-900">
      Catálogo de productos
    </h1>
    <p className="text-sm text-slate-600">
      Módulo tipo Ti Sicar / Eleventa para administrar tus
      productos.
    </p>
  </div>

  <div className="flex flex-col items-end gap-2">
    <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
      SUPER TIENDA TENAY POS
    </span>

    <Link
      href="/pos"
      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-slate-800"
    >
      ← Regresar al POS
    </Link>
  </div>
</header>

        {error && (
          <div className="rounded-md bg-red-100 border border-red-200 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Buscador */}
        <section className="rounded-xl bg-white p-4 shadow-md space-y-3">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                SKU o código de barras del producto
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Ej. 7501234567890 o SKU-001"
                value={searchCode}
                onChange={(e) =>
                  setSearchCode(e.target.value)
                }
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Buscando..."
                  : "Buscar kardex"}
              </button>
            </div>
          </form>
          <p className="text-[11px] text-slate-500">
            Puedes configurar más adelante una búsqueda por nombre /
            selección desde catálogo, pero para auditorías y revisiones
            rápidas, suele usarse SKU o código de barras.
          </p>
        </section>

        {/* Info producto + totales */}
        {data && (
          <>
            <section className="rounded-xl bg-white p-4 shadow-md space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    Producto
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {data.product.name}
                  </div>
                  <div className="text-[11px] text-slate-600 space-x-2">
                    {data.product.sku && (
                      <span>SKU: {data.product.sku}</span>
                    )}
                    {data.product.barcode && (
                      <span>
                        CB: {data.product.barcode}
                      </span>
                    )}
                    {data.product.category && (
                      <span>
                        · {data.product.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs md:w-[420px]">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    <div className="text-slate-500">
                      Saldo inicial
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatQty(data.initialBalance)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    <div className="text-slate-500">
                      Stock actual
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatQty(data.currentStock)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    <div className="text-slate-500">
                      Movimientos
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {data.movements.length}
                    </div>
                  </div>
                </div>
              </div>

              {totals && (
                <div className="grid grid-cols-2 gap-3 text-xs md:w-[320px]">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <div className="text-emerald-700">
                      Total entradas
                    </div>
                    <div className="text-sm font-semibold text-emerald-900">
                      {formatQty(totals.totalIn)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                    <div className="text-red-700">
                      Total salidas
                    </div>
                    <div className="text-sm font-semibold text-red-900">
                      {formatQty(totals.totalOut)}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                El saldo inicial se calcula con base en el stock actual y
                la suma de todos los movimientos encontrados (ventas y
                ajustes). El último saldo debe coincidir con el stock
                actual del producto.
              </p>
            </section>

            {/* Tabla de movimientos */}
            <section className="rounded-xl bg-white p-4 shadow-md">
              {data.movements.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay movimientos registrados para este
                  producto.
                </p>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-[11px]">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-2 py-2 text-left">
                          Fecha
                        </th>
                        <th className="px-2 py-2 text-left">
                          Tipo
                        </th>
                        <th className="px-2 py-2 text-left">
                          Ref
                        </th>
                        <th className="px-2 py-2 text-right">
                          Entrada
                        </th>
                        <th className="px-2 py-2 text-right">
                          Salida
                        </th>
                        <th className="px-2 py-2 text-right">
                          Existencia
                        </th>
                        <th className="px-2 py-2 text-left">
                          Nota
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.movements.map((m, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-2 py-1 align-top">
                            {formatDate(m.date)}
                          </td>
                          <td className="px-2 py-1 align-top">
                            {m.type}
                          </td>
                          <td className="px-2 py-1 align-top">
                            {m.reference || "-"}
                          </td>
                          <td className="px-2 py-1 text-right align-top text-emerald-700">
                            {m.quantityIn
                              ? formatQty(m.quantityIn)
                              : ""}
                          </td>
                          <td className="px-2 py-1 text-right align-top text-red-700">
                            {m.quantityOut
                              ? formatQty(m.quantityOut)
                              : ""}
                          </td>
                          <td className="px-2 py-1 text-right align-top">
                            {formatQty(m.balanceAfter)}
                          </td>
                          <td className="px-2 py-1 align-top">
                            {m.note || ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
