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

export default function InventoryAddPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [qtyToAdd, setQtyToAdd] = useState<number>(0);
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
    setQtyToAdd(0);
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

    // 1) Coincidencia exacta por código de barras
    let p =
      products.find((pr) => pr.barcode === code) ||
      products.find((pr) => pr.sku === code) ||
      products.find((pr) => pr._id === code);

    // 2) Si no, buscar por que contenga en nombre
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

  const warningText = useMemo(() => {
    if (!selectedProduct) return "";
    const exist = selectedProduct.stock || 0;
    const q = qtyToAdd || 0;
    const newExist = exist + q;
    return `Se recibirán ${q} de inventario para el producto, el costo se actualizará a $${(
      cost || 0
    ).toFixed(2)}, el precio de venta será de $${(
      priceRetail || 0
    ).toFixed(
      2
    )} y el precio de mayoreo de $${(priceWholesale || 0).toFixed(
      2
    )}. La existencia quedará en ${newExist}.`;
  }, [selectedProduct, qtyToAdd, cost, priceRetail, priceWholesale]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (!selectedProduct) {
      setError("Primero selecciona un producto.");
      return;
    }
    if (!qtyToAdd || qtyToAdd <= 0) {
      setError("La cantidad a agregar debe ser mayor a 0.");
      return;
    }

    try {
      setSaving(true);

      const body = {
        productId: selectedProduct._id,
        quantity: qtyToAdd,
        cost,
        priceRetail,
        priceWholesale,
        reason:
          reason ||
          "Entrada de inventario desde pantalla Agregar inventario",
      };

      const res = await fetch("/api/inventory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.message || "Error al agregar inventario"
        );
      }

      setSuccess(
        `Inventario agregado correctamente. Nueva existencia: ${
          data.product?.stock ?? ""
        }`
      );

      // Actualizar producto en la lista local
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

      setQtyToAdd(0);
    } catch (e: any) {
      setError(e.message || "Error al agregar inventario");
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
              Agregar inventario
            </h1>
            <p className="text-sm text-slate-600">
              Captura entradas de mercancía: escanea o escribe el
              código del producto, ajusta costo y precios y suma al
              inventario.
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

        {/* Buscador de producto */}
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

        {/* Formulario de agregar inventario */}
        <section className="rounded-xl bg-white p-4 shadow-md">
          {!selectedProduct ? (
            <p className="text-sm text-slate-500">
              Busca un producto por código, SKU o código de barras
              para ver su existencia y agregar inventario.
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
                    Hay (existencia actual)
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
                    Agregar
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={qtyToAdd}
                    onChange={(e) =>
                      setQtyToAdd(Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Precios */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Precio costo
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
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Motivo / comentario (opcional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Ej. Compra a proveedor X, ajuste de conteo físico, etc."
                />
              </div>

              {/* Mensaje estilo Eleventa */}
              {warningText && (
                <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  {warningText}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !qtyToAdd}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "Guardando entrada..."
                    : "Agregar cantidad a inventario"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
