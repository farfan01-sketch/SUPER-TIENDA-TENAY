"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type Variant = {
  _id: string;
  name?: string;
  variantText?: string;
  label?: string;
  type?: string;
  size?: string;
  color?: string;
  aroma?: string;
  flavor?: string;
  sku?: string;
  barcode?: string;
  stock?: number;
};

type KardexProduct = {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  cost: number;
  priceRetail: number;
  stock: number;
  hasVariants?: boolean;
  variants?: Variant[];
  selectedVariant?: Variant | null;
};

type KardexMovement = {
  date: string;
  type: string;
  reference?: string;
  variantId?: string;
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  note?: string;
  createdByName?: string;
};

type KardexResponse = {
  product: KardexProduct;
  initialBalance: number;
  currentStock: number;
  movements: KardexMovement[];
};

function getVariantLabel(v: Variant) {
  return (
    v.label ||
    v.name ||
    v.variantText ||
    [v.type, v.size, v.color, v.aroma, v.flavor]
      .filter(Boolean)
      .join(" / ") ||
    "Variante"
  );
}

export default function KardexPage() {
  const [searchCode, setSearchCode] = useState("");
  const [data, setData] = useState<KardexResponse | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearMessages() {
    setError(null);
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

  async function fetchKardexByParams(params: URLSearchParams) {
    const res = await fetch(`/api/inventory/kardex?${params.toString()}`);
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json?.message || "No se pudo obtener el kardex");
    }

    return json as KardexResponse;
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    setData(null);
    setVariants([]);
    setShowVariants(false);
    setSelectedVariantId("");
    setDateFrom("");
    setDateTo("");

    const code = searchCode.trim();

    if (!code) {
      setError("Captura SKU o código de barras del producto");
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({
        skuOrBarcode: code,
      });

      const json = await fetchKardexByParams(params);

      setData(json);
      setVariants(json.product?.variants || []);
    } catch (e: any) {
      setError(e.message || "Error al obtener kardex");
    } finally {
      setLoading(false);
    }
  }

  async function handleVariantSelect(variantId: string) {
    if (!data?.product?._id) return;

    clearMessages();

    try {
      setLoading(true);

      const params = new URLSearchParams({
        productId: data.product._id,
        variantId,
      });

      const json = await fetchKardexByParams(params);

      setData(json);
      setVariants(json.product?.variants || variants);
      setSelectedVariantId(variantId);
      setDateFrom("");
      setDateTo("");
    } catch (e: any) {
      setError(e.message || "Error al cargar kardex de variante");
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneralProductKardex() {
    if (!data?.product?._id) return;

    clearMessages();

    try {
      setLoading(true);

      const params = new URLSearchParams({
        productId: data.product._id,
      });

      const json = await fetchKardexByParams(params);

      setData(json);
      setVariants(json.product?.variants || variants);
      setSelectedVariantId("");
      setDateFrom("");
      setDateTo("");
    } catch (e: any) {
      setError(e.message || "Error al cargar kardex general");
    } finally {
      setLoading(false);
    }
  }

  const filteredMovements = useMemo(() => {
    if (!data) return [];

    return (data.movements || []).filter((m) => {
      const movementDate = new Date(m.date);

      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (movementDate < from) return false;
      }

      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`);
        if (movementDate > to) return false;
      }

      return true;
    });
  }, [data, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const totalIn = filteredMovements.reduce(
      (acc, m) => acc + Number(m.quantityIn || 0),
      0
    );

    const totalOut = filteredMovements.reduce(
      (acc, m) => acc + Number(m.quantityOut || 0),
      0
    );

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
    };
  }, [filteredMovements]);

  function clearDateFilters() {
    setDateFrom("");
    setDateTo("");
  }

  function escapeCsv(value: any) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    if (!data) return;

    const selectedVariant = data.product.selectedVariant;
    const title = selectedVariant
      ? `${data.product.name} - ${getVariantLabel(selectedVariant)}`
      : data.product.name;

    const rows = [
      [
        "Producto",
        "SKU",
        "Código de barras",
        "Variante",
        "Fecha",
        "Tipo",
        "Referencia",
        "Entrada",
        "Salida",
        "Existencia",
        "Nota",
        "Usuario",
      ],
      ...filteredMovements.map((m) => [
        data.product.name,
        data.product.sku || "",
        data.product.barcode || "",
        selectedVariant ? getVariantLabel(selectedVariant) : "",
        formatDate(m.date),
        m.type,
        m.reference || "",
        m.quantityIn || "",
        m.quantityOut || "",
        m.balanceAfter || "",
        m.note || "",
        m.createdByName || "",
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const safeName = title
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    a.href = url;
    a.download = `kardex_${safeName || "producto"}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const selectedVariant = data?.product?.selectedVariant || null;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Kardex de inventario
            </h1>
            <p className="text-sm text-slate-600">
              Historial de entradas, salidas, ventas, devoluciones y ajustes.
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
          <div className="rounded-md border border-red-200 bg-red-100 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <section className="space-y-3 rounded-xl bg-white p-4 shadow-md">
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
                onChange={(e) => setSearchCode(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {loading ? "Buscando..." : "Buscar kardex"}
            </button>
          </form>
        </section>

        {data && (
          <>
            <section className="space-y-3 rounded-xl bg-white p-4 shadow-md">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Producto
                  </div>

                  <div className="text-lg font-bold text-slate-900">
                    {data.product.name}
                  </div>

                  <div className="space-x-2 text-[11px] text-slate-600">
                    {data.product.sku && <span>SKU: {data.product.sku}</span>}
                    {data.product.barcode && (
                      <span>CB: {data.product.barcode}</span>
                    )}
                    {data.product.category && (
                      <span>· {data.product.category}</span>
                    )}
                  </div>

                  {selectedVariant && (
                    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                      Viendo kardex de variante:{" "}
                      <strong>{getVariantLabel(selectedVariant)}</strong>
                    </div>
                  )}

                  {variants.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowVariants((prev) => !prev)}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          {showVariants ? "Ocultar variantes" : "Ver variantes"}
                        </button>

                        {selectedVariantId && (
                          <button
                            type="button"
                            onClick={handleGeneralProductKardex}
                            className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Ver kardex general
                          </button>
                        )}
                      </div>

                      {showVariants && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 text-xs font-semibold text-slate-700">
                            Selecciona una variante
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {variants.map((v) => (
                              <button
                                key={v._id}
                                type="button"
                                onClick={() => handleVariantSelect(v._id)}
                                className={`rounded-full border px-3 py-1 text-xs ${
                                  selectedVariantId === v._id
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                                }`}
                              >
                                {getVariantLabel(v)} · Stock:{" "}
                                {formatQty(Number(v.stock || 0))}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs md:w-[420px]">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">Saldo inicial</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatQty(data.initialBalance)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">Stock actual</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatQty(data.currentStock)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-slate-500">Movimientos</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {filteredMovements.length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearDateFilters}
                    className="w-full rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300"
                  >
                    Limpiar filtros
                  </button>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={exportCsv}
                    disabled={filteredMovements.length === 0}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Exportar CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs md:w-[520px]">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <div className="text-emerald-700">Entradas filtradas</div>
                  <div className="text-sm font-semibold text-emerald-900">
                    {formatQty(totals.totalIn)}
                  </div>
                </div>

                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                  <div className="text-red-700">Salidas filtradas</div>
                  <div className="text-sm font-semibold text-red-900">
                    {formatQty(totals.totalOut)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-slate-700">Neto filtrado</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formatQty(totals.net)}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-white p-4 shadow-md">
              {filteredMovements.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay movimientos registrados para este filtro.
                </p>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-[11px]">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-2 py-2 text-left">Fecha</th>
                        <th className="px-2 py-2 text-left">Tipo</th>
                        <th className="px-2 py-2 text-left">Ref</th>
                        <th className="px-2 py-2 text-right">Entrada</th>
                        <th className="px-2 py-2 text-right">Salida</th>
                        <th className="px-2 py-2 text-right">Existencia</th>
                        <th className="px-2 py-2 text-left">Nota</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredMovements.map((m, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-2 py-1 align-top">
                            {formatDate(m.date)}
                          </td>

                          <td className="px-2 py-1 align-top">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                m.quantityIn
                                  ? "bg-emerald-50 text-emerald-700"
                                  : m.quantityOut
                                  ? "bg-red-50 text-red-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>

                          <td className="px-2 py-1 align-top">
                            {m.reference || "-"}
                          </td>

                          <td className="px-2 py-1 text-right align-top text-emerald-700">
                            {m.quantityIn ? formatQty(m.quantityIn) : ""}
                          </td>

                          <td className="px-2 py-1 text-right align-top text-red-700">
                            {m.quantityOut ? formatQty(m.quantityOut) : ""}
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