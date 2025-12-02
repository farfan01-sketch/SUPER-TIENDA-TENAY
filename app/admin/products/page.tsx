"use client";

import {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";
import Link from "next/link";

type VariantKind = "ropa" | "maquillaje" | "perfume";

type Variant = {
  kind: VariantKind;
  size?: string;
  color?: string;
  tone?: string;
  scent?: string;
  cost: number;
  priceRetail: number;
  priceWholesale?: number;
  stock: number;
};

type Product = {
  _id?: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  imageUrl?: string;
  cost: number;
  priceRetail: number;
  priceWholesale?: number;
  stock: number;
  minStock?: number;
  isActive: boolean;
  variants: Variant[];
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Product>({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    imageUrl: "",
    cost: 0,
    priceRetail: 0,
    priceWholesale: 0,
    stock: 0,
    minStock: 0,
    isActive: true,
    variants: [],
  });

  const [variantForm, setVariantForm] = useState<Variant>({
    kind: "ropa",
    size: "",
    color: "",
    tone: "",
    scent: "",
    cost: 0,
    priceRetail: 0,
    priceWholesale: 0,
    stock: 0,
  });

  async function loadProducts() {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("No se pudo cargar productos");
      const data = await res.json();
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

  function resetForm() {
    setForm({
      name: "",
      sku: "",
      barcode: "",
      category: "",
      imageUrl: "",
      cost: 0,
      priceRetail: 0,
      priceWholesale: 0,
      stock: 0,
      minStock: 0,
      isActive: true,
      variants: [],
    });
    setVariantForm({
      kind: "ropa",
      size: "",
      color: "",
      tone: "",
      scent: "",
      cost: 0,
      priceRetail: 0,
      priceWholesale: 0,
      stock: 0,
    });
    setEditingId(null);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setForm((prev) => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  function addVariant() {
    if (
      !variantForm.size &&
      !variantForm.color &&
      !variantForm.tone &&
      !variantForm.scent
    ) {
      return;
    }

    setForm({
      ...form,
      variants: [...form.variants, { ...variantForm }],
    });

    setVariantForm({
      kind: variantForm.kind,
      size: "",
      color: "",
      tone: "",
      scent: "",
      cost: 0,
      priceRetail: 0,
      priceWholesale: 0,
      stock: 0,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.sku || !form.cost || !form.priceRetail) {
      setError("Nombre, SKU, costo y precio son obligatorios");
      return;
    }

    try {
      setSaving(true);

      const url = editingId
        ? `/api/products?id=${editingId}`
        : "/api/products";

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.message || "Error al guardar producto"
        );
      }

      resetForm();
      await loadProducts();
    } catch (e: any) {
      setError(e.message || "Error al guardar producto");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(p: Product) {
    setForm({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || "",
      category: p.category || "",
      imageUrl: p.imageUrl || "",
      cost: p.cost,
      priceRetail: p.priceRetail,
      priceWholesale: p.priceWholesale || 0,
      stock: p.stock,
      minStock: p.minStock || 0,
      isActive: p.isActive,
      variants: p.variants || [],
    });
    setEditingId(p._id || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(p: Product) {
    if (!p._id) return;
    const ok = window.confirm(
      `¿Seguro que deseas eliminar el producto "${p.name}"?`
    );
    if (!ok) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/products?id=${p._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.message || "Error al eliminar producto"
        );
      }
      if (editingId === p._id) {
        resetForm();
      }
      await loadProducts();
    } catch (e: any) {
      setError(e.message || "Error al eliminar producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
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
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
              SUPER TIENDA TENAY POS
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
          <div className="rounded-md bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Formulario */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              {editingId ? "Modificar producto" : "Nuevo producto"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-blue-600 underline"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-4 md:gap-6"
          >
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                SKU *
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.sku}
                onChange={(e) =>
                  setForm({ ...form, sku: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Código de barras
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.barcode}
                onChange={(e) =>
                  setForm({ ...form, barcode: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Categoría
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              />
            </div>

            {/* Imagen */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Imagen del producto
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-2 file:rounded-md file:border-none file:bg-slate-200 file:px-2 file:py-1 file:text-xs file:font-medium"
                onChange={handleImageChange}
              />
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="mt-2 h-16 rounded object-cover"
                />
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Costo *
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.cost}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cost: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Precio menudeo *
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.priceRetail}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priceRetail: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Precio mayoreo
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.priceWholesale}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priceWholesale: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Stock inicial
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.stock}
                onChange={(e) =>
                  setForm({
                    ...form,
                    stock: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Stock mínimo
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.minStock}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minStock: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isActive: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="isActive"
                className="text-xs font-medium text-slate-700"
              >
                Producto activo
              </label>
            </div>

            {/* VARIANTES */}
            <div className="md:col-span-4 border-t pt-4 mt-2">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Variantes (ropa / maquillaje / perfume)
              </h3>

              <div className="mb-3 flex flex-wrap gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Tipo de variante
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={variantForm.kind}
                    onChange={(e) =>
                      setVariantForm({
                        ...variantForm,
                        kind: e.target.value as VariantKind,
                      })
                    }
                  >
                    <option value="ropa">Ropa (talla / color)</option>
                    <option value="maquillaje">
                      Maquillaje (tono)
                    </option>
                    <option value="perfume">Perfume (aroma)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                {variantForm.kind === "ropa" && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Talla
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={variantForm.size}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            size: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Color
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={variantForm.color}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            color: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {variantForm.kind === "maquillaje" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Tono
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={variantForm.tone}
                      onChange={(e) =>
                        setVariantForm({
                          ...variantForm,
                          tone: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {variantForm.kind === "perfume" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Aroma
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={variantForm.scent}
                      onChange={(e) =>
                        setVariantForm({
                          ...variantForm,
                          scent: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Costo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={variantForm.cost}
                    onChange={(e) =>
                      setVariantForm({
                        ...variantForm,
                        cost: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Precio menudeo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={variantForm.priceRetail}
                    onChange={(e) =>
                      setVariantForm({
                        ...variantForm,
                        priceRetail: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Precio mayoreo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={variantForm.priceWholesale}
                    onChange={(e) =>
                      setVariantForm({
                        ...variantForm,
                        priceWholesale: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={variantForm.stock}
                    onChange={(e) =>
                      setVariantForm({
                        ...variantForm,
                        stock: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={addVariant}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                >
                  Añadir variante
                </button>
              </div>

              {form.variants.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-b bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-2 py-1">Tipo</th>
                        <th className="px-2 py-1">Detalle</th>
                        <th className="px-2 py-1">Costo</th>
                        <th className="px-2 py-1">Precio men.</th>
                        <th className="px-2 py-1">Precio may.</th>
                        <th className="px-2 py-1">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.variants.map((v, idx) => {
                        let detalle = "";
                        if (v.kind === "ropa") {
                          detalle = `${v.size || "-"} ${v.color || ""}`.trim();
                        } else if (v.kind === "maquillaje") {
                          detalle = `Tono ${v.tone || "-"}`;
                        } else {
                          detalle = `Aroma ${v.scent || "-"}`;
                        }

                        return (
                          <tr
                            key={idx}
                            className="border-b last:border-0"
                          >
                            <td className="px-2 py-1">
                              {v.kind === "ropa"
                                ? "Ropa"
                                : v.kind === "maquillaje"
                                ? "Maquillaje"
                                : "Perfume"}
                            </td>
                            <td className="px-2 py-1">
                              {detalle}
                            </td>
                            <td className="px-2 py-1">
                              ${v.cost.toFixed(2)}
                            </td>
                            <td className="px-2 py-1">
                              ${v.priceRetail.toFixed(2)}
                            </td>
                            <td className="px-2 py-1">
                              {v.priceWholesale
                                ? `$${v.priceWholesale.toFixed(2)}`
                                : "-"}
                            </td>
                            <td className="px-2 py-1">
                              {v.stock}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="md:col-span-4 flex justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving
                  ? "Guardando..."
                  : editingId
                  ? "Guardar cambios"
                  : "Guardar producto"}
              </button>
            </div>
          </form>
        </section>

        {/* Tabla */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Lista de productos
            </h2>
            {loading && (
              <span className="text-xs text-slate-500">
                Cargando productos...
              </span>
            )}
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay productos registrados todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Imagen</th>
                    <th className="px-3 py-2">Nombre / Variante</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Código barras</th>
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2">Costo</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Activo</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const baseRow = (
                      <tr
                        key={p._id}
                        className="border-b last:border-0 hover:bg-slate-50 align-top"
                      >
                        <td className="px-3 py-2">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">
                            {p.name}
                          </div>
                          {p.variants &&
                            p.variants.length > 0 && (
                              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                                {p.variants.map((v, idx) => {
                                  let label = "";
                                  if (v.kind === "ropa") {
                                    label =
                                      (v.size || "-") +
                                      " " +
                                      (v.color || "");
                                  } else if (
                                    v.kind === "maquillaje"
                                  ) {
                                    label =
                                      "Tono " +
                                      (v.tone || "-");
                                  } else {
                                    label =
                                      "Aroma " +
                                      (v.scent || "-");
                                  }
                                  return (
                                    <li key={idx}>
                                      • {label} ({v.stock} pzas)
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                        </td>
                        <td className="px-3 py-2">
                          {p.sku}
                        </td>
                        <td className="px-3 py-2">
                          {p.barcode || "-"}
                        </td>
                        <td className="px-3 py-2">
                          {p.category || "-"}
                        </td>
                        <td className="px-3 py-2">
                          ${p.cost.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          ${p.priceRetail.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          {p.stock}
                        </td>
                        <td className="px-3 py-2">
                          {p.isActive ? "Sí" : "No"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(p)}
                              className="rounded-md bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                            >
                              Modificar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );

                    return baseRow;
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
