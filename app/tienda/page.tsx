"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  imageUrl?: string;
  cost?: number;
  priceRetail: number;
  priceWholesale?: number;
  stock: number;
  isActive?: boolean;
};

type ApiProduct = Product;

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

// 🔢 WhatsApp de la tienda (ajústalo como necesites, sin espacios ni signos)
const STORE_WHATSAPP = "529712316195"; // 52 + 9712316195

export default function OnlineStorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // 🛒 Carrito
  const [cart, setCart] = useState<CartItem[]>([]);

  // 👤 Datos del cliente
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [sendingOrder, setSendingOrder] = useState(false);

  function clearMessages() {
    setError(null);
  }

  async function loadProducts() {
    try {
      setLoading(true);
      clearMessages();

      const res = await fetch("/api/products");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "No se pudieron cargar los productos"
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

  // 🔹 Categorías únicas (solo productos activos)
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const active = p.isActive !== false;
      if (!active) return;
      const cat = (p.category || "").trim();
      if (cat) set.add(cat);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  }, [products]);

  // 🔹 Productos filtrados por categoría + búsqueda
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = products.filter((p) => {
      const active = p.isActive !== false;
      if (!active) return false;

      if (selectedCategory) {
        const cat = (p.category || "").trim().toLowerCase();
        if (cat !== selectedCategory.toLowerCase()) return false;
      }
      return true;
    });

    if (!q) return base;

    return base.filter((p) => {
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
  }, [products, search, selectedCategory]);

  function formatMoney(value: number | undefined | null) {
    const num = Number(value || 0);
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    });
  }

  // 🛒 Lógica del carrito
  function addToCart(product: Product) {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product._id
      );
      const price = product.priceRetail || 0;

      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: copy[existingIndex].quantity + 1,
        };
        return copy;
      }

      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price,
          quantity: 1,
        },
      ];
    });
  }

  function updateCartQuantity(productId: string, newQty: number) {
    setCart((prev) => {
      if (newQty <= 0) {
        return prev.filter((item) => item.productId !== productId);
      }
      return prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: newQty }
          : item
      );
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      ),
    [cart]
  );

  // 🟢 WhatsApp + mensaje
  function cleanPhone(phone: string): string {
    // Deja solo dígitos
    return phone.replace(/\D/g, "");
  }

  function buildOrderMessage() {
    let text =
      "*Nuevo pedido desde la tienda en línea – Super Tienda Tenay*\n\n";

    if (customerName || customerPhone || customerAddress || customerEmail) {
      text += "*Datos del cliente:*\n";
      if (customerName) text += `Nombre: ${customerName}\n`;
      if (customerPhone) text += `WhatsApp: ${customerPhone}\n`;
      if (customerAddress) text += `Dirección: ${customerAddress}\n`;
      if (customerEmail) text += `Correo: ${customerEmail}\n`;
      text += "\n";
    }

    text += "*Productos:*\n";
    cart.forEach((item, index) => {
      const subtotal = item.price * item.quantity;
      text += `${index + 1}. ${item.name} x${
        item.quantity
      } – ${formatMoney(item.price)} c/u = ${formatMoney(
        subtotal
      )}\n`;
    });

    text += `\n*Total aproximado:* ${formatMoney(cartTotal)}\n\n`;
    text +=
      "Por favor confirma existencias, forma de pago y tiempo de entrega. 🙌";
    return text;
  }

    async function sendOrder() {
    if (cart.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    const storePhone = cleanPhone(STORE_WHATSAPP); // WhatsApp de la tienda
    const custPhoneClean = cleanPhone(customerPhone); // WhatsApp del cliente (si lo captura)

    if (!storePhone) {
      alert(
        "No se ha configurado correctamente el número de WhatsApp de la tienda."
      );
      return;
    }

    const text = buildOrderMessage(); // 👈 ya NO usamos encodeURIComponent

    try {
      setSendingOrder(true);

      // 1) Guardar pedido en tu backend (igual que antes)
      await fetch("/api/online-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: cart.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          total: cartTotal,
          customer: {
            name: customerName,
            phone: customerPhone,
            address: customerAddress,
            email: customerEmail,
          },
          source: "tienda-online",
          createdAt: new Date().toISOString(),
        }),
      });

      // 2) Enviar mensaje a WhatsApp de la TIENDA (automático, sin ventanas)
      await fetch("/api/whatsapp/send-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: storePhone,
          message: text,
        }),
      });

      // 3) Opcional: enviar copia al CLIENTE si puso su número
      if (custPhoneClean) {
        await fetch("/api/whatsapp/send-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: custPhoneClean,
            message: text,
          }),
        });
      }

      // 4) Limpiar carrito y datos del cliente
      clearCart();
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerEmail("");

      alert("Pedido enviado por WhatsApp correctamente 😎");
    } catch (e) {
      console.error("Error al enviar pedido:", e);
      alert(
        "Ocurrió un error al enviar el pedido por WhatsApp. Inténtalo de nuevo."
      );
    } finally {
      setSendingOrder(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* BARRA SUPERIOR CON LOGO CENTRADO */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-3 md:py-4">
          <div className="h-14 w-14 overflow-hidden rounded-full bg-white border border-pink-200 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/uploads/logo.jpg"
              alt="Logo Super Tienda Tenay"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">
              Super Tienda Tenay
            </p>
            <p className="text-sm text-slate-500">Tienda en línea</p>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* Hero / título */}
        <section className="rounded-2xl bg-gradient-to-r from-pink-200 via-pink-300 to-pink-200 px-5 py-6 text-slate-900 shadow-md md:px-8 md:py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Compra en línea en Super Tienda Tenay
              </h1>
              <p className="mt-2 text-sm text-slate-200 max-w-xl">
                Productos con existencia real conectada a nuestro
                punto de venta. Haz tu pedido y te confirmamos por
                WhatsApp.
              </p>
            </div>
            <div className="rounded-xl bg-pink-100/60 p-4 text-slate-900 shadow">
              <p className="font-semibold">¿Cómo funciona?</p>
              <p className="text-slate-100">
                1) Elige tus productos · 2) Armamos tu pedido y lo
                enviamos por WhatsApp · 3) Pagas en tienda o con el
                método que acordemos.
              </p>
            </div>
          </div>
        </section>

        {/* Buscador, categorías y resumen */}
        <section className="rounded-xl bg-white p-4 shadow-sm md:p-5 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Buscar producto
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Busca por nombre, categoría, SKU o código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* 🔹 Filtro por categoría */}
              {categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("")}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                      !selectedCategory
                        ? "border-pink-500 bg-pink-500 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-pink-300 hover:bg-pink-50"
                    }`}
                  >
                    Todas
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                        selectedCategory === cat
                          ? "border-pink-500 bg-pink-500 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-pink-300 hover:bg-pink-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 md:text-right">
              <p>
                Mostrando{" "}
                <span className="font-semibold text-slate-900">
                  {filteredProducts.length}
                </span>{" "}
                producto(s)
                {selectedCategory && (
                  <>
                    {" "}
                    en{" "}
                    <span className="font-semibold">
                      {selectedCategory}
                    </span>
                  </>
                )}
              </p>
              {loading && (
                <p className="text-[11px] text-slate-400">
                  Cargando catálogo...
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </section>

        {/* Productos + Carrito */}
        <section className="rounded-xl bg-white p-4 shadow-sm md:p-5">
          <div className="grid gap-4 lg:grid-cols-[3fr,2fr]">
            {/* GRID DE PRODUCTOS */}
            <div>
              {loading && products.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Cargando productos de la tienda...
                </p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No encontramos productos con ese filtro.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {filteredProducts.map((p) => {
                    const agotado = p.stock <= 0;
                    return (
                      <article
                        key={p._id}
                        className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:border-slate-400 transition-colors"
                      >
                        <div className="relative h-32 w-full bg-slate-100 md:h-36">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                              Sin imagen
                            </div>
                          )}
                          {agotado && (
                            <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-[2px] text-[10px] font-semibold text-white shadow">
                              Agotado
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-slate-400">
                            {p.category || "Sin categoría"}
                          </div>
                          <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">
                            {p.name}
                          </h2>
                          <div className="mt-1 text-base font-bold text-slate-900">
                            {formatMoney(p.priceRetail)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Stock:{" "}
                            <span className="font-semibold">
                              {p.stock}
                            </span>
                          </div>
                          <div className="mt-2">
                            <button
                              type="button"
                              disabled={agotado}
                              className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed"
                              onClick={() => addToCart(p)}
                            >
                              {agotado
                                ? "Sin existencias"
                                : "Añadir al carrito"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANEL DE CARRITO */}
            <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4">
              <h2 className="text-sm font-semibold text-slate-800">
                Tu carrito
              </h2>

              {cart.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  Aún no has agregado productos. Toca “Añadir al
                  carrito” en el catálogo.
                </p>
              ) : (
                <>
                  <div className="mt-2 max-h-56 space-y-2 overflow-auto rounded-md bg-white p-2 border border-slate-200">
                    {cart.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatMoney(item.price)} c/u
                          </p>
                          <p className="text-[11px] text-slate-700">
                            Subtotal:{" "}
                            <span className="font-semibold">
                              {formatMoney(
                                item.price * item.quantity
                              )}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="h-6 w-6 rounded-full border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              onClick={() =>
                                updateCartQuantity(
                                  item.productId,
                                  item.quantity - 1
                                )
                              }
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              className="w-10 rounded border border-slate-300 px-1 py-0.5 text-[11px] text-center outline-none"
                              value={item.quantity}
                              onChange={(e) =>
                                updateCartQuantity(
                                  item.productId,
                                  Number(e.target.value)
                                )
                              }
                            />
                            <button
                              type="button"
                              className="h-6 w-6 rounded-full border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              onClick={() =>
                                updateCartQuantity(
                                  item.productId,
                                  item.quantity + 1
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className="text-[10px] text-red-500 hover:text-red-700"
                            onClick={() =>
                              removeFromCart(item.productId)
                            }
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Total productos:</span>
                      <span className="font-semibold">
                        {cart.reduce(
                          (acc, item) => acc + item.quantity,
                          0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-slate-900">
                      <span>Total estimado:</span>
                      <span>{formatMoney(cartTotal)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={clearCart}
                  >
                    Vaciar carrito
                  </button>
                </>
              )}

              {/* Datos del cliente */}
              <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs">
                <p className="text-[11px] font-semibold text-slate-700">
                  Datos para el pedido
                </p>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-600">
                    Nombre del cliente
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej. Yanet"
                    value={customerName}
                    onChange={(e) =>
                      setCustomerName(e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-600">
                    WhatsApp del cliente
                  </label>
                  <input
                    type="tel"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej. 971 123 45 67"
                    value={customerPhone}
                    onChange={(e) =>
                      setCustomerPhone(e.target.value)
                    }
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Si lo capturas, también le enviaremos el pedido por
                    WhatsApp.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-600">
                    Dirección
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Calle, número, colonia..."
                    rows={2}
                    value={customerAddress}
                    onChange={(e) =>
                      setCustomerAddress(e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-600">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej. cliente@correo.com"
                    value={customerEmail}
                    onChange={(e) =>
                      setCustomerEmail(e.target.value)
                    }
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Te servirá para enviar promociones y seguimiento a
                    tus clientes.
                  </p>
                </div>
              </div>

              {/* Botón único WhatsApp */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={sendOrder}
                  disabled={cart.length === 0 || sendingOrder}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {sendingOrder ? "Enviando pedido..." : "Enviar pedido"}
                </button>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
