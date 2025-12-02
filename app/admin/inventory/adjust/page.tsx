"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Product = {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  cost: number;
  priceRetail: number;
  priceWholesale?: number;
  stock: number;
};

type ApiProduct = Product;

export default function InventoryAdjustPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchCode, setSearchCode] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [qtyDelta, setQtyDelta] = useState<number>(0);
  const [newQtyInput, setNewQtyInput] = useState<string>("");

  const [cost, setCost] = useState<number>(0);
  const [priceRetail, setPriceRetail] = useState<number>(0);
  const [priceWholesale, setPriceWholesale] =
    useState<number>(0);

  const [reason, setReason] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function loadProducts() {
    try {
      setLoading(true);
      clearMessages();
      const res = await fetch("/api/products");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "No se pudieron cargar productos"
        );
      }
      const data: ApiProduct[] = await res.json();
      setProducts(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function fillFromProduct(p: Product) {
    setSelectedProduct(p);
    setQtyDelta(0);
    setNewQtyInput(String(p.stock || 0));
    setCost(p.cost || 0);
    setPriceRetail(p.priceRetail || 0);
    setPriceWholesale(p.priceWholesale || 0);
    setReason("");
  }

  function handleFindProduct() {
    clearMessages();
    const code = searchCode.trim();
    if (!code) {
      setSelectedProduct(null);
      return;
    }

    let p =
      products.find((pr) => pr.barcode === code) ||
      products.find((pr) => pr.sku === code) ||
      products.find((pr) => pr._id === code);

    if (!p) {
      const lower = code.toLowerCase();
      const matches = products.filter((pr) =>
        pr.name.toLowerCase().includes(lower)
      );
      if (matches.length === 1) {
        p = matches[0];
      }
    }

    if (!p) {
      setSelectedProduct(null);
      setError("Producto no encontrado con ese código / texto.");
      return;
    }

    fillFromProduct(p);
  }

  function handleCodeKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFindProduct();
    }
  }

  // Nueva cantidad calculada a partir de delta
  const newQtyFromDelta = useMemo(() => {
    if (!selectedProduct) return 0;
    return (selectedProduct.stock || 0) + (qtyDelta || 0);
  }, [selectedProduct, qtyDelta]);

  // Para mostrar/editar "Nueva cantidad"
  useEffect(() => {
    if (selectedProduct) {
      setNewQtyInput(String(newQtyFromDelta));
    } else {
      setNewQtyInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newQtyFromDelta]);

  function handleNewQtyChange(value: string) {
    setNewQtyInput(value);
    const num = Number(value);
    if (!selectedProduct || Number.isNaN(num)) return;
    const current = selectedProduct.stock || 0;
    setQtyDelta(num - current);
  }

  const warningText = useMemo(() => {
    if (!selectedProduct) return "";
    const current = selectedProduct.stock || 0;
    const delta = qtyDelta || 0;
    const newQty = current + delta;

    return `Se realizará un ajuste de ${delta} para que el inventario pase de ${current} a ${newQty}, con un costo de $${(
      cost || 0
    ).toFixed(2)}, precio de venta $${(priceRetail || 0).toFixed(
      2
    )} y precio mayoreo $${(priceWholesale || 0).toFixed(2)}.`;
  }, [selectedProduct, qtyDelta, cost, priceRetail, priceWholesale]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (!selectedProduct) {
      setError("Primero selecciona un producto.");
      return;
    }

    const current = selectedProduct.stock || 0;
    const newQtyParsed = Number(newQtyInput);

    if (Number.isNaN(newQtyParsed)) {
      setError("La nueva cantidad no es válida.");
      return;
    }

    const delta = newQtyParsed - current;
    if (delta === 0) {
      setError(
        "La nueva cantidad es igual a la actual, no hay nada que ajustar."
      );
      return;
    }

    if (newQtyParsed < 0) {
      setError("La nueva cantidad no puede ser negativa.");
      return;
    }

    try {
      setSaving(true);

      const body = {
        productId: selectedProduct._id,
        delta, // positivo o negativo
        newStock: newQtyParsed,
        cost,
        priceRetail,
        priceWholesale,
        reason:
          reason ||
          "Ajuste de inventario desde pantalla Ajustar inventario",
      };

      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.message || "Error al realizar ajuste de inventario"
        );
      }

      setSuccess(
        `Ajuste realizado correctamente. Nueva existencia: ${
          data.product?.stock ?? ""
        }`
      );

      // Actualizar producto en la lista
      if (data.product?._id) {
        setProducts((prev) =>
          prev.map((p) =>
            p._id === data.product._id
              ? {
                  ...p,
                  stock: data.product.stock,
                  cost: data.product.cost,
                  priceRetail: data.product.priceRetail,
                  priceWholesale: data.product.priceWholesale,
                }
              : p
          )
        );

        const updated = products.find(
          (p) => p._id === data.product._id
        );
        if (updated) {
          fillFromProduct({
            ...updated,
            stock: data.product.stock,
            cost: data.product.cost,
            priceRetail: data.product.priceRetail,
            priceWholesale: data.product.priceWholesale,
          });
        }
      }
    } catch (e: any) {
      setError(
        e.message || "Error al realizar ajuste de inventario"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
                {/* Encabezado */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Ajustar inventario
            </h1>
            <p className="text-sm text-slate-600">
              Corrige existencias por mermas, conteos físicos o
              errores de captura. Puedes ajustar en + / - o fijar una
              nueva cantidad.
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

        {/* Buscador */}
        <section className="rounded-xl bg-white p-4 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Código del producto / SKU / Código de barras
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Escanea o escribe el código y presiona Enter..."
                value={searchCode}
                onChange={(e) =>
                  setSearchCode(e.target.value)
                }
                onKeyDown={handleCodeKeyDown}
              />
            </div>
            <button
              type="button"
              onClick={handleFindProduct}
              className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            >
              Buscar
            </button>
          </div>
          {loading && (
            <p className="text-xs text-slate-500">
              Cargando productos...
            </p>
          )}
        </section>

        {/* Formulario de ajuste */}
        <section className="rounded-xl bg-white p-4 shadow-md">
          {!selectedProduct ? (
            <p className="text-sm text-slate-500">
              Busca un producto para ver su existencia y realizar un
              ajuste de inventario.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 text-sm"
            >
              {/* Datos del producto */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={selectedProduct.name}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Código / SKU / CB
                  </label>
                  <input
                    type="text"
                    disabled
                    value={
                      selectedProduct.barcode ||
                      selectedProduct.sku ||
                      selectedProduct._id
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Cantidad actual
                  </label>
                  <input
                    type="number"
                    disabled
                    value={selectedProduct.stock || 0}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    + / - (ajuste)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={qtyDelta}
                    onChange={(e) =>
                      setQtyDelta(Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej. -2, 5, 10.5"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Nueva cantidad
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newQtyInput}
                    onChange={(e) =>
                      handleNewQtyChange(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Costo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) =>
                      setCost(Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Precio venta
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceRetail}
                    onChange={(e) =>
                      setPriceRetail(Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Precio mayoreo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceWholesale}
                    onChange={(e) =>
                      setPriceWholesale(
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Motivo del ajuste
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) =>
                      setReason(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej. Merma, conteo físico, caducidad, etc."
                  />
                </div>
              </div>

              {warningText && (
                <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  {warningText}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "Realizando ajuste..."
                    : "Realizar ajuste de inventario"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
