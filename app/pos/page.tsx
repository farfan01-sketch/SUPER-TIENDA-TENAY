"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Variant = {
  _id?: string;
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
  _id: string;
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
  variants?: Variant[];
  productType?: "generic" | "clothing" | "makeup" | "perfume";
};

type CartItem = {
  productId: string;
  name: string;
  variantText?: string;
  quantity: number;
  price: number;
  cost?: number;
  subtotal: number;
};

type PaymentMethod =
  | "Efectivo"
  | "Tarjeta – Crédito"
  | "Tarjeta – Débito"
  | "Transferencia"
  | "MercadoPago"
  | "Crédito"
  | "Mixto"
  | string;

type PaymentRow = {
  method: PaymentMethod;
  amount: number;
};

type Customer = {
  _id: string;
  name: string;
  phone?: string;
  creditLimit?: number;
  currentBalance?: number;
};

type SaleResponse = {
  message: string;
  sale?: {
    _id: string;
    folio: string;
  };
};

type SessionUser = {
  username: string;
  role: string;
};

export default function PosPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [onlineOrderId, setOnlineOrderId] =
    useState<string | null>(null);

  // 🔎 Búsqueda / código de barras
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // 💳 Pagos combinados
  const [payments, setPayments] = useState<PaymentRow[]>([
    { method: "Efectivo", amount: 0 },
  ]);

  // 👤 Cliente (crédito)
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string>("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [savingSale, setSavingSale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastSaleFolio, setLastSaleFolio] = useState<string | null>(
    null
  );

  // 👤 Info del cajero (desde cookie sessionUser)
  const [sessionUser, setSessionUser] =
    useState<SessionUser | null>(null);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  // Leer cookie sessionUser en el cliente
  useEffect(() => {
    if (typeof document === "undefined") return;
    const rawCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("sessionUser="))
      ?.split("=")[1];

    if (!rawCookie) return;
    try {
      const json = decodeURIComponent(rawCookie);
      const data = JSON.parse(json);
      if (data?.username) {
        setSessionUser({
          username: data.username,
          role: data.role || "",
        });
      }
    } catch {
      // si falla, no hacemos nada
    }
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // aunque falle, lo mandamos al login
    } finally {
      router.push("/login");
    }
  }

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("No se pudieron cargar productos");
      const data = await res.json();
      setProducts(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar productos");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadCustomers() {
    try {
      setLoadingCustomers(true);
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("No se pudieron cargar clientes");
      const data = await res.json();
      setCustomers(data);
    } catch (e: any) {
      setError(
        (prev) => prev || e.message || "Error al cargar clientes (crédito)"
      );
    } finally {
      setLoadingCustomers(false);
    }
  }

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  useEffect(() => {
    const c = customers.find((cu) => cu._id === selectedCustomerId);
    setSelectedCustomer(c || null);
  }, [selectedCustomerId, customers]);

  // 🧮 Totales
  const subtotal = useMemo(
    () =>
      cart.reduce(
        (acc, item) => acc + Number(item.subtotal || 0),
        0
      ),
    [cart]
  );

  const total = useMemo(
    () => Math.max(subtotal - Number(discount || 0), 0),
    [subtotal, discount]
  );

  const totalPayments = useMemo(
    () =>
      payments.reduce(
        (acc, p) => acc + Number(p.amount || 0),
        0
      ),
    [payments]
  );

  const creditAmount = useMemo(
    () =>
      payments
        .filter(
          (p) =>
            p.method && p.method.toLowerCase() === "crédito"
        )
        .reduce(
          (acc, p) => acc + Number(p.amount || 0),
          0
        ),
    [payments]
  );

  const cashRow = useMemo(
    () =>
      payments.find((p) => p.method === "Efectivo") || null,
    [payments]
  );

  const nonCashTotal = useMemo(
    () =>
      payments
        .filter((p) => p.method !== "Efectivo")
        .reduce(
          (acc, p) => acc + Number(p.amount || 0),
          0
        ),
    [payments]
  );

  // Cambio solo cuando hay efectivo
  const change = useMemo(() => {
    if (!cashRow) return 0;
    const expectedCash = Number(total || 0) - nonCashTotal;
    if (cashRow.amount <= expectedCash) return 0;
    return cashRow.amount - expectedCash;
  }, [cashRow, nonCashTotal, total]);

  // 🔎 Filtrado de productos (nombre, sku, código barras)
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = p.name.toLowerCase();
      const sku = p.sku?.toLowerCase() || "";
      const barcode = p.barcode?.toLowerCase() || "";
      return (
        name.includes(q) ||
        sku.includes(q) ||
        barcode.includes(q)
      );
    });
  }, [searchTerm, products]);

  // Escaneo rápido por Enter (código de barras)
  function handleSearchKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = searchTerm.trim();
      if (!code) return;

      // Primero busca coincidencia exacta por código de barras
      const byBarcode = products.find(
        (p) => p.barcode === code
      );
      if (byBarcode) {
        addProductToCart(byBarcode);
        setSearchTerm("");
        return;
      }

      // Luego por SKU exacto
      const bySku = products.find((p) => p.sku === code);
      if (bySku) {
        addProductToCart(bySku);
        setSearchTerm("");
        return;
      }
    }
  }

  function addProductToCart(product: Product, variant?: Variant) {
    clearMessages();

    const price =
      variant?.priceRetail ?? product.priceRetail ?? 0;
    const cost = variant?.cost ?? product.cost ?? 0;

    const variantText = (() => {
      if (!variant) return undefined;
      const parts: string[] = [];
      if (variant.size) parts.push(`Talla: ${variant.size}`);
      if (variant.color) parts.push(`Color: ${variant.color}`);
      if (variant.tone) parts.push(`Tono: ${variant.tone}`);
      if (variant.scent) parts.push(`Aroma: ${variant.scent}`);
      return parts.join(" · ");
    })();

    setCart((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.productId === product._id &&
          item.variantText === variantText
      );

      if (idx >= 0) {
        const copy = [...prev];
        const existing = copy[idx];
        const newQty = existing.quantity + 1;
        copy[idx] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.price,
        };
        return copy;
      }

      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          variantText,
          quantity: 1,
          price,
          cost,
          subtotal: price,
        },
      ];
    });
  }

  function updateCartQuantity(index: number, newQty: number) {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setCart((prev) => {
      const copy = [...prev];
      const item = copy[index];
      copy[index] = {
        ...item,
        quantity: newQty,
        subtotal: newQty * item.price,
      };
      return copy;
    });
  }

  function removeCartItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function resetSale() {
    setCart([]);
    setDiscount(0);
    setPayments([{ method: "Efectivo", amount: 0 }]);
    setSelectedCustomerId("");
    setSelectedCustomer(null);
    setSearchTerm("");
  }

  function updatePaymentMethod(index: number, method: string) {
    setPayments((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        method: method as PaymentMethod,
      };
      return copy;
    });
  }

  function updatePaymentAmount(index: number, amount: number) {
    setPayments((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        amount,
      };
      return copy;
    });
  }

  function addPaymentRow() {
    setPayments((prev) => [
      ...prev,
      { method: "Efectivo", amount: 0 },
    ]);
  }

  function removePaymentRow(index: number) {
    setPayments((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  function formatMoney(value: number) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (cart.length === 0) {
      setError("No hay productos en el ticket");
      return;
    }

    if (total <= 0) {
      setError("El total debe ser mayor a 0");
      return;
    }

    // Validar que haya pagos
    if (!payments || payments.length === 0) {
      setError("Debes especificar al menos una forma de pago");
      return;
    }

    // Validar suma de pagos = total
    if (Math.abs(totalPayments - total) > 0.01) {
      setError(
        `La suma de las formas de pago (${formatMoney(
          totalPayments
        )}) no coincide con el total (${formatMoney(total)}).`
      );
      return;
    }

    // Validar crédito -> requiere cliente
    if (creditAmount > 0 && !selectedCustomer) {
      setError(
        "Para usar Crédito en la venta debes seleccionar un cliente."
      );
      return;
    }

    try {
      setSavingSale(true);

      const body = {
        items: cart,
        subtotal,
        discount,
        total,
        payments,
        customerId: selectedCustomer?._id,
        customerName: selectedCustomer?.name,
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data: SaleResponse = await res
        .json()
        .catch(() => ({ message: "Error desconocido" }));

      if (!res.ok) {
        throw new Error(
          data.message || "Error al guardar venta"
        );
      }

      setLastSaleId(data.sale?._id || null);
      setLastSaleFolio(data.sale?.folio || null);

      if (creditAmount > 0 && selectedCustomer) {
        setSuccess(
          `Venta con crédito registrada. Cliente: ${
            selectedCustomer.name
          }. Folio: ${
            data.sale?.folio || ""
          }. El saldo del cliente se actualizó.`
        );
      } else {
        setSuccess(
          `Venta registrada correctamente. Folio: ${
            data.sale?.folio || ""
          }`
        );
      }

      // 🔹 Si esta venta viene de un pedido en línea, márcalo como "processed"
      if (onlineOrderId && data.sale?._id) {
        try {
          await fetch("/api/online-orders", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: onlineOrderId,
              status: "processed",
              linkedSaleId: data.sale._id,
            }),
          });
        } catch (err) {
          console.error(
            "No se pudo marcar el pedido en línea como procesado:",
            err
          );
        } finally {
          setOnlineOrderId(null);
        }
      }

      resetSale();
      await loadProducts();
      if (creditAmount > 0) {
        await loadCustomers();
      }
    } catch (e: any) {
      setError(e.message || "Error al guardar venta");
    } finally {
      setSavingSale(false);
    }
  }

  // ⌨️ Atajos de teclado: F2 cobrar, F3 buscar
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "F3") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "F2") {
        e.preventDefault();
        const form = document.getElementById(
          "pos-sale-form"
        ) as HTMLFormElement | null;
        form?.requestSubmit();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () =>
      window.removeEventListener("keydown", handleKey);
  }, []);

  // 🔄 Cargar borrador de pedido en línea desde localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(
        "posOnlineOrderDraft"
      );
      if (!raw) return;

      const draft: any = JSON.parse(raw);

      const rawItems =
        draft.items || draft.products || draft.cart || [];

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        window.localStorage.removeItem("posOnlineOrderDraft");
        return;
      }

      const mapped: CartItem[] = rawItems
        .map((it: any) => {
          const quantity = Number(it.quantity || 1);
          const unitPrice =
            Number(it.price) ||
            Number(it.priceRetail) ||
            0;

          const subtotal =
            Number(it.subtotal) || quantity * unitPrice;

          const productId =
            it.productId || it._id || it.id || "";

          const name =
            it.name || it.productName || it.title || "";

          if (!productId || !name) return null;

          return {
            productId,
            name,
            variantText: it.variantText,
            quantity,
            price: unitPrice,
            cost:
              typeof it.cost === "number"
                ? it.cost
                : typeof it.costUnit === "number"
                ? it.costUnit
                : undefined,
            subtotal,
          };
        })
        .filter(Boolean) as CartItem[];

      if (mapped.length === 0) {
        window.localStorage.removeItem("posOnlineOrderDraft");
        return;
      }

      // Cargar carrito con el pedido de la tienda
      setCart(mapped);
      setDiscount(0);
      setPayments([{ method: "Efectivo", amount: 0 }]);
      setSelectedCustomerId("");
      setSelectedCustomer(null);
      setSearchTerm("");

      // 🔹 Guardamos el id del pedido online para después marcarlo como procesado
      setOnlineOrderId(draft.orderId || draft.id || null);

      setSuccess(
        `Pedido en línea cargado${
          draft.orderId ? ` (folio web: ${draft.orderId})` : ""
        }. Ahora solo cobra y guarda la venta.`
      );
    } finally {
      // Limpia para que no se vuelva a cargar al refrescar
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("posOnlineOrderDraft");
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl grid gap-4 md:grid-cols-[2fr,1.4fr]">
        {/* IZQUIERDA: productos */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-5 flex flex-col">
          {/* HEADER PRO */}
          <header className="mb-3 w-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Punto de venta
                </h1>
                <p className="text-xs text-slate-600">
                  Super Tienda Tenay POS – Venta rápida, con
                  crédito y formas de pago combinadas.
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Atajos:{" "}
                  <span className="font-semibold">
                    F2 = Cobrar · F3 = Buscar producto
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-semibold text-slate-900 shadow">
                  Caja principal
                </span>
                {sessionUser && (
                  <span className="text-[11px] text-slate-600">
                    Cajero:{" "}
                    <span className="font-semibold">
                      {sessionUser.username}
                    </span>{" "}
                    · Rol:{" "}
                    <span className="font-semibold">
                      {sessionUser.role}
                    </span>
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {lastSaleFolio && (
                    <span className="text-[10px] text-emerald-700">
                      Última venta: {lastSaleFolio}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow hover:bg-slate-800"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>

            {/* BARRA DE ACCESOS RÁPIDOS */}
            <nav className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow">
                POS / Venta
              </span>
              <Link
                href="/admin/products"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Productos
              </Link>
              <Link
                href="/admin/customers"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Clientes
              </Link>
              <Link
                href="/admin/sales"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Ventas / Reimpresión
              </Link>
              <Link
                href="/admin/corte"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Corte de caja
              </Link>
              {/* 🔗 Reservas */}
              <Link
                href="/admin/reservas"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Reservas
              </Link>
              {/* 🔗 Pedidos en línea */}
              <Link
                href="/admin/online-orders"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Pedidos en línea
              </Link>
              {/* ⭐ Reportes */}
              <Link
                href="/admin/reports"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Reportes
              </Link>
              <Link
                href="/admin/users"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Usuarios
              </Link>
              <Link
                href="/admin/config"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Configuración
              </Link>
              <Link
                href="/admin/inventory"
                className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Inventario
              </Link>
            </nav>
          </header>

          {error && (
            <div className="mb-2 rounded-md bg-red-100 border border-red-200 px-3 py-2 text-[11px] text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-2 rounded-md bg-emerald-100 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-800">
              {success}
              {lastSaleId && (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href={`/ticket/${lastSaleId}`}
                    target="_blank"
                    className="underline"
                  >
                    Ver ticket
                  </Link>
                </>
              )}
            </div>
          )}

          {/* 🔎 Buscador / código de barras */}
          <div className="mb-3 flex gap-2">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nombre, SKU o escanear código de barras..."
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {loadingProducts ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                Cargando productos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                No hay productos que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 overflow-auto pr-1 md:grid-cols-3">
                {filteredProducts.map((p) => {
                  const hasVariants =
                    p.variants && p.variants.length > 0;
                  return (
                    <div
                      key={p._id}
                      className="rounded-lg border border-slate-200 p-2 text-xs hover:border-slate-400 cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2">
                        {p.imageUrl && (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <div className="font-semibold line-clamp-2">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {p.category || "Sin categoría"}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            SKU: {p.sku}
                          </div>
                          {p.barcode && (
                            <div className="text-[10px] text-slate-500">
                              CB: {p.barcode}
                            </div>
                          )}
                          <div className="text-[11px] font-semibold text-emerald-700">
                            {formatMoney(p.priceRetail ?? 0)}
                          </div>
                        </div>
                      </div>

                      {hasVariants ? (
                        <div className="mt-1 space-y-1">
                          {(p.variants || []).map((v, idx) => {
                            const vt = [];
                            if (v.size) vt.push(`T${v.size}`);
                            if (v.color) vt.push(v.color);
                            if (v.tone) vt.push(v.tone);
                            if (v.scent) vt.push(v.scent);
                            const vLabel =
                              vt.join(" / ") || "Variante";

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                  addProductToCart(p, v)
                                }
                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-left hover:bg-slate-50 flex items-center justify-between"
                              >
                                <span>{vLabel}</span>
                                <span className="font-semibold text-emerald-700">
                                  {formatMoney(
                                    v.priceRetail ||
                                      p.priceRetail ||
                                      0
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addProductToCart(p)}
                          className="mt-2 w-full rounded-lg bg-slate-900 px-2 py-1.5 text-[10px] font-semibold text-white shadow hover:bg-slate-800"
                        >
                          Añadir
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* DERECHA: ticket + pago */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-5 flex flex-col">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">
            Ticket actual
          </h2>

          {/* Ticket */}
          <div className="flex-1 overflow-auto border border-slate-200 rounded-lg p-2 mb-3">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Agrega productos desde la izquierda.
              </div>
            ) : (
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-1 py-1 text-left">Producto</th>
                    <th className="px-1 py-1 text-center">Cant</th>
                    <th className="px-1 py-1 text-right">P. Unit</th>
                    <th className="px-1 py-1 text-right">Importe</th>
                    <th className="px-1 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100"
                    >
                      <td className="px-1 py-1 align-top">
                        <div className="font-semibold">
                          {item.name}
                        </div>
                        {item.variantText && (
                          <div className="text-[10px] text-slate-500">
                            {item.variantText}
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-1 text-center align-middle">
                        <input
                          type="number"
                          min={1}
                          className="w-12 rounded border border-slate-300 px-1 py-0.5 text-[11px] text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartQuantity(
                              idx,
                              Number(e.target.value)
                            )
                          }
                        />
                      </td>
                      <td className="px-1 py-1 text-right align-middle">
                        {formatMoney(item.price)}
                      </td>
                      <td className="px-1 py-1 text-right align-middle">
                        {formatMoney(item.subtotal)}
                      </td>
                      <td className="px-1 py-1 text-right align-middle">
                        <button
                          type="button"
                          onClick={() =>
                            removeCartItem(idx)
                          }
                          className="text-[10px] text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <form
            id="pos-sale-form"
            onSubmit={handleSubmit}
            className="space-y-3 text-xs"
          >
            {/* Cliente (crédito) */}
            <div className="rounded-lg border border-slate-200 p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-700">
                  Cliente (crédito)
                </span>
                {loadingCustomers && (
                  <span className="text-[10px] text-slate-500">
                    Cargando clientes...
                  </span>
                )}
              </div>
              <select
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-1"
                value={selectedCustomerId}
                onChange={(e) =>
                  setSelectedCustomerId(e.target.value)
                }
                disabled={customers.length === 0}
              >
                <option value="">
                  {customers.length === 0
                    ? "No hay clientes – crea clientes en /admin/customers"
                    : "Sin cliente (contado)"}
                </option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="text-[10px] text-slate-600">
                  Límite:{" "}
                  <span className="font-semibold">
                    {formatMoney(
                      selectedCustomer.creditLimit || 0
                    )}
                  </span>{" "}
                  · Saldo actual:{" "}
                  <span className="font-semibold text-red-600">
                    {formatMoney(
                      selectedCustomer.currentBalance || 0
                    )}
                  </span>
                </div>
              )}
              {creditAmount > 0 && !selectedCustomer && (
                <div className="mt-1 text-[10px] text-red-600">
                  Para usar Crédito debes seleccionar un cliente.
                </div>
              )}
            </div>

            {/* Totales con descuento */}
            <div className="rounded-lg border border-slate-200 p-2 space-y-1 bg-slate-50">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Descuento:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-[11px] text-right outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(Number(e.target.value))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>Total:</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

            {/* Formas de pago combinadas */}
            <div className="rounded-lg border border-slate-200 p-2 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-700">
                  Formas de pago
                </span>
                <button
                  type="button"
                  onClick={addPaymentRow}
                  className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow hover:bg-slate-800"
                >
                  Añadir forma
                </button>
              </div>

              <div className="space-y-1">
                {payments.map((p, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[2fr,2fr,auto] gap-1 items-center"
                  >
                    <select
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={p.method}
                      onChange={(e) =>
                        updatePaymentMethod(
                          idx,
                          e.target.value
                        )
                      }
                    >
                      <option value="Efectivo">
                        Efectivo
                      </option>
                      <option value="Tarjeta – Crédito">
                        Tarjeta – Crédito
                      </option>
                      <option value="Tarjeta – Débito">
                        Tarjeta – Débito
                      </option>
                      <option value="Transferencia">
                        Transferencia
                      </option>
                      <option value="MercadoPago">
                        MercadoPago
                      </option>
                      <option value="Crédito">
                        Crédito
                      </option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] text-right outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={p.amount}
                      onChange={(e) =>
                        updatePaymentAmount(
                          idx,
                          Number(e.target.value)
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        removePaymentRow(idx)
                      }
                      className="text-[11px] text-red-500 hover:text-red-700 px-2"
                      disabled={payments.length <= 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-200 pt-1 mt-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Total pagos:</span>
                  <span>{formatMoney(totalPayments)}</span>
                </div>
                {cashRow && (
                  <div className="flex justify-between">
                    <span>Cambio (efectivo):</span>
                    <span>{formatMoney(change)}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  savingSale ||
                  cart.length === 0 ||
                  total <= 0
                }
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {savingSale
                  ? "Guardando venta..."
                  : "Cobrar y guardar venta"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
