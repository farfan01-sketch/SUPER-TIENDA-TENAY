"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Variant = {
  _id: string;
  name?: string;
  variantText?: string;
  type?: string;
  size?: string;
  color?: string;
  aroma?: string;
  flavor?: string;
  sku?: string;
  barcode?: string;
  cost?: number;
  priceRetail?: number;
  priceWholesale?: number;
  stock?: number;
};

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
  variants?: Variant[];
};

type ApiProduct = Product;

function getVariantLabel(v: Variant) {
  return (
    v.name ||
    v.variantText ||
    [v.type, v.size, v.color, v.aroma, v.flavor]
      .filter(Boolean)
      .join(" / ") ||
    "Variante"
  );
}

export default function InventoryAddPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [showVariants, setShowVariants] = useState(false);

  const [qtyToAdd, setQtyToAdd] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [priceRetail, setPriceRetail] = useState<number>(0);
  const [priceWholesale, setPriceWholesale] = useState<number>(0);
  const [reason, setReason] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const variants = selectedProduct?.variants || [];
  const hasVariants = variants.length > 0;

  const selectedVariant = variants.find(
    (v) => v._id?.toString() === selectedVariantId
  );

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
        throw new Error(data.message || "No se pudieron cargar productos");
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
    setSelectedVariantId("");
    setShowVariants(false);
    setQtyToAdd(0);
    setCost(p.cost || 0);
    setPriceRetail(p.priceRetail || 0);
    setPriceWholesale(p.priceWholesale || 0);
    setReason("");
  }

  function fillFromVariant(v: Variant) {
    setSelectedVariantId(v._id);
    setQtyToAdd(0);
    setCost(Number(v.cost ?? selectedProduct?.cost ?? 0));
    setPriceRetail(Number(v.priceRetail ?? selectedProduct?.priceRetail ?? 0));
    setPriceWholesale(
      Number(v.priceWholesale ?? selectedProduct?.priceWholesale ?? 0)
    );
  }

  function handleFindProduct() {
    clearMessages();

    const code = searchCode.trim();

    if (!code) {
      setSelectedProduct(null);
      setSelectedVariantId("");
      return;
    }

    let foundProduct: Product | undefined;
    let foundVariant: Variant | undefined;

    for (const product of products) {
      const productMatches =
        product.barcode === code || product.sku === code || product._id === code;

      if (productMatches) {
        foundProduct = product;
        break;
      }

      const variant = (product.variants || []).find(
        (v) => v.barcode === code || v.sku === code || v._id === code
      );

      if (variant) {
        foundProduct = product;
        foundVariant = variant;
        break;
      }
    }

    if (!foundProduct) {
      const lower = code.toLowerCase();
      const matches = products.filter((pr) =>
        pr.name.toLowerCase().includes(lower)
      );

      if (matches.length === 1) {
        foundProduct = matches[0];
      }
    }

    if (!foundProduct) {
      setSelectedProduct(null);
      setSelectedVariantId("");
      setError("Producto no encontrado con ese código / texto.");
      return;
    }

    fillFromProduct(foundProduct);

    if (foundVariant) {
      setShowVariants(true);
      fillFromVariant(foundVariant);
    }
  }

  function handleCodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFindProduct();
    }
  }

  const currentStock = selectedVariant
    ? Number(selectedVariant.stock || 0)
    : selectedProduct
    ? Number(selectedProduct.stock || 0)
    : 0;

  const warningText = useMemo(() => {
    if (!selectedProduct) return "";

    const q = qtyToAdd || 0;
    const newExist = currentStock + q;

    const targetText = selectedVariant
      ? `la variante "${getVariantLabel(selectedVariant)}"`
      : "el producto";

    return `Se recibirán ${q} de inventario para ${targetText}, el costo se actualizará a $${(
      cost || 0
    ).toFixed(2)}, el precio de venta será de $${(priceRetail || 0).toFixed(
      2
    )} y el precio de mayoreo de $${(priceWholesale || 0).toFixed(
      2
    )}. La existencia quedará en ${newExist}.`;
  }, [
    selectedProduct,
    selectedVariant,
    qtyToAdd,
    cost,
    priceRetail,
    priceWholesale,
    currentStock,
  ]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (!selectedProduct) {
      setError("Primero selecciona un producto.");
      return;
    }

    if (hasVariants && !selectedVariantId) {
      setError("Este producto tiene variantes. Selecciona una variante.");
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
        variantId: selectedVariantId || undefined,
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
        throw new Error(data.message || "Error al agregar inventario");
      }

      setSuccess(
        selectedVariantId
          ? `Inventario agregado correctamente a la variante. Nueva existencia: ${
              data.variant?.stock ?? ""
            }`
          : `Inventario agregado correctamente. Nueva existencia: ${
              data.product?.stock ?? ""
            }`
      );

      if (data.product?._id) {
        setProducts((prev) =>
          prev.map((p) =>
            p._id === data.product._id
              ? {
                  ...p,
                  stock: data.product.stock ?? p.stock,
                  cost: data.product.cost ?? p.cost,
                  priceRetail: data.product.priceRetail ?? p.priceRetail,
                  priceWholesale:
                    data.product.priceWholesale ?? p.priceWholesale,
                  variants: data.product.variants ?? p.variants,
                }
              : p
          )
        );

        const updatedProduct: Product = {
          ...selectedProduct,
          stock: data.product.stock ?? selectedProduct.stock,
          cost: data.product.cost ?? selectedProduct.cost,
          priceRetail: data.product.priceRetail ?? selectedProduct.priceRetail,
          priceWholesale:
            data.product.priceWholesale ?? selectedProduct.priceWholesale,
          variants: data.product.variants ?? selectedProduct.variants,
        };

        setSelectedProduct(updatedProduct);

        if (selectedVariantId && data.variant) {
          const updatedVariant = (updatedProduct.variants || []).find(
            (v) => v._id?.toString() === selectedVariantId
          );

          if (updatedVariant) {
            fillFromVariant(updatedVariant);
          }
        } else {
          setCost(updatedProduct.cost || 0);
          setPriceRetail(updatedProduct.priceRetail || 0);
          setPriceWholesale(updatedProduct.priceWholesale || 0);
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
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Agregar inventario
            </h1>
            <p className="text-sm text-slate-600">
              Captura entradas de mercancía: escanea o escribe el código del
              producto, ajusta costo y precios y suma al inventario.
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
          <div className="rounded-md border border-red-200 bg-red-100 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-emerald-200 bg-emerald-100 px-4 py-2 text-xs text-emerald-800">
            {success}
          </div>
        )}

        <section className="space-y-3 rounded-xl bg-white p-4 shadow-md">
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
                onChange={(e) => setSearchCode(e.target.value)}
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
            <p className="text-xs text-slate-500">Cargando productos...</p>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-md">
          {!selectedProduct ? (
            <p className="text-sm text-slate-500">
              Busca un producto por código, SKU o código de barras para ver su
              existencia y agregar inventario.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
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
                    value={currentStock}
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
                    onChange={(e) => setQtyToAdd(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {hasVariants && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Este producto tiene variantes
                      </p>
                      <p className="text-xs text-slate-600">
                        Selecciona una variante para agregar existencia, costo y
                        precios.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowVariants((prev) => !prev)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
                    >
                      {showVariants ? "Ocultar variantes" : "Variantes"}
                    </button>
                  </div>

                  {showVariants && (
                    <div className="mt-3 space-y-2">
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Selecciona variante
                      </label>

                      <select
                        value={selectedVariantId}
                        onChange={(e) => {
                          const id = e.target.value;
                          const variant = variants.find(
                            (v) => v._id?.toString() === id
                          );
                          if (variant) fillFromVariant(variant);
                          else setSelectedVariantId("");
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar variante...</option>
                        {variants.map((v) => (
                          <option key={v._id} value={v._id}>
                            {getVariantLabel(v)} — Stock: {Number(v.stock || 0)}
                          </option>
                        ))}
                      </select>

                      <div className="grid gap-2 md:grid-cols-2">
                        {variants.map((v) => (
                          <button
                            key={v._id}
                            type="button"
                            onClick={() => fillFromVariant(v)}
                            className={`rounded-lg border px-3 py-2 text-left text-xs ${
                              selectedVariantId === v._id
                                ? "border-blue-500 bg-white text-blue-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                            }`}
                          >
                            <div className="font-semibold">
                              {getVariantLabel(v)}
                            </div>
                            <div>Stock: {Number(v.stock || 0)}</div>
                            <div>
                              Costo: ${Number(v.cost ?? selectedProduct.cost ?? 0).toFixed(2)}
                            </div>
                            <div>
                              Venta: ${Number(v.priceRetail ?? selectedProduct.priceRetail ?? 0).toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Precio costo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
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
                    onChange={(e) => setPriceRetail(Number(e.target.value))}
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
                    onChange={(e) => setPriceWholesale(Number(e.target.value))}
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
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Ej. Compra a proveedor X, ajuste de conteo físico, etc."
                />
              </div>

              {warningText && (
                <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  {warningText}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !qtyToAdd}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {saving
                    ? "Guardando entrada..."
                    : selectedVariantId
                    ? "Agregar inventario a variante"
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