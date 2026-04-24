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

type Permissions = {
  canSell: boolean;
  canManageProducts: boolean;
  canSeeReports: boolean;
  canDoCashCuts: boolean;
  canCancelSales: boolean;
  canManageUsers: boolean;
  canAccessConfig: boolean;
};

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
  _id: string;
  username: string;
  role: string;
  permissions: Permissions;
};

type Shift = {
  _id: string;
  userId?: string;
  username: string;
  initialCash: number;
  openedAt: string;
  closedAt?: string | null;
  status?: "open" | "closed";
};

export default function PosPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [onlineOrderId, setOnlineOrderId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [payments, setPayments] = useState<PaymentRow[]>([
    { method: "Efectivo", amount: 0 },
  ]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const [savingSale, setSavingSale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastSaleFolio, setLastSaleFolio] = useState<string | null>(null);

  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [initialCash, setInitialCash] = useState<number>(0);
  const [openingShift, setOpeningShift] = useState(false);
  const [closingShift, setClosingShift] = useState(false);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function loadSession() {
    try {
      setSessionLoading(true);

      const res = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!res.ok) {
        setSessionUser(null);
        return;
      }

      const data = await res.json();
      setSessionUser(data.user ?? data);
    } catch (e) {
      console.error("Error al cargar sesión:", e);
      setSessionUser(null);
    } finally {
      setSessionLoading(false);
    }
  }

  async function loadCurrentShift() {
    try {
      setShiftLoading(true);

      const res = await fetch("/api/shifts/current", {
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo cargar el turno actual");
      }

      const data = await res.json();

      if (!data.hasOpenShift) {
        setCurrentShift(null);
        return;
      }

      setCurrentShift(data.shift);
    } catch (e: any) {
      console.error("Error al cargar turno:", e);
      setCurrentShift(null);
    } finally {
      setShiftLoading(false);
    }
  }

  async function handleOpenShift(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (Number(initialCash) < 0) {
      setError("La provisión inicial no puede ser negativa");
      return;
    }

    try {
      setOpeningShift(true);

      const res = await fetch("/api/shifts/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialCash: Number(initialCash || 0),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "No se pudo iniciar el turno");
      }

      setCurrentShift(data.shift ?? data);
      setSuccess("Turno iniciado correctamente");
    } catch (e: any) {
      setError(e.message || "Error al iniciar turno");
    } finally {
      setOpeningShift(false);
    }
  }

  async function handleCloseShiftOnly() {
    const finalCashText = window.prompt(
      "Ingresa el efectivo final en caja para cerrar el turno:"
    );

    if (finalCashText === null) {
      throw new Error("Cierre de turno cancelado");
    }

    const finalCash = Number(finalCashText);

    if (isNaN(finalCash) || finalCash < 0) {
      throw new Error("El efectivo final no es válido");
    }

    try {
      setClosingShift(true);

      const res = await fetch("/api/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCash }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "No se pudo cerrar el turno");
      }

      setCurrentShift(null);
    } catch (e: any) {
      throw new Error(e.message || "Error al cerrar turno");
    } finally {
      setClosingShift(false);
    }
  }

  async function doLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // Aunque falle, salimos al login.
    } finally {
      router.push("/login");
    }
  }

  async function handleLogout() {
    clearMessages();

    if (!currentShift) {
      await doLogout();
      return;
    }

    const option = window.prompt(
      'Escribe "1" para salir y dejar turno abierto.\nEscribe "2" para cerrar turno y salir.\nEscribe cualquier otra cosa para cancelar.'
    );

    if (option === null) return;

    if (option.trim() === "1") {
      await doLogout();
      return;
    }

    if (option.trim() === "2") {
      try {
        await handleCloseShiftOnly();
        await doLogout();
      } catch (e: any) {
        setError(e.message || "No se pudo cerrar turno y salir");
      }
      return;
    }

    setSuccess("Salida cancelada");
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
    loadSession();
    loadCurrentShift();
  }, []);

  useEffect(() => {
    if (!sessionLoading && sessionUser?.permissions?.canSell && currentShift) {
      loadProducts();
      loadCustomers();
    }
  }, [sessionLoading, sessionUser, currentShift]);

  useEffect(() => {
    const c = customers.find((cu) => cu._id === selectedCustomerId);
    setSelectedCustomer(c || null);
  }, [selectedCustomerId, customers]);

  const subtotal = useMemo(
    () =>
      cart.reduce((acc, item) => acc + Number(item.subtotal || 0), 0),
    [cart]
  );

  const total = useMemo(
    () => Math.max(subtotal - Number(discount || 0), 0),
    [subtotal, discount]
  );

  const totalPayments = useMemo(
    () => payments.reduce((acc, p) => acc + Number(p.amount || 0), 0),
    [payments]
  );

  const creditAmount = useMemo(
    () =>
      payments
        .filter((p) => p.method && p.method.toLowerCase() === "crédito")
        .reduce((acc, p) => acc + Number(p.amount || 0), 0),
    [payments]
  );

  const cashRow = useMemo(
    () => payments.find((p) => p.method === "Efectivo") || null,
    [payments]
  );

  const nonCashTotal = useMemo(
    () =>
      payments
        .filter((p) => p.method !== "Efectivo")
        .reduce((acc, p) => acc + Number(p.amount || 0), 0),
    [payments]
  );

  const change = useMemo(() => {
    if (!cashRow) return 0;
    const expectedCash = Number(total || 0) - nonCashTotal;
    if (cashRow.amount <= expectedCash) return 0;
    return cashRow.amount - expectedCash;
  }, [cashRow, nonCashTotal, total]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      const name = p.name.toLowerCase();
      const sku = p.sku?.toLowerCase() || "";
      const barcode = p.barcode?.toLowerCase() || "";
      return name.includes(q) || sku.includes(q) || barcode.includes(q);
    });
  }, [searchTerm, products]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = searchTerm.trim();
      if (!code) return;

      const byBarcode = products.find((p) => p.barcode === code);
      if (byBarcode) {
        addProductToCart(byBarcode);
        setSearchTerm("");
        return;
      }

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

    const price = variant?.priceRetail ?? product.priceRetail ?? 0;
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
          item.productId === product._id && item.variantText === variantText
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
    setPayments((prev) => [...prev, { method: "Efectivo", amount: 0 }]);
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

    if (!currentShift) {
      setError("Debes iniciar turno antes de vender");
      return;
    }

    if (cart.length === 0) {
      setError("No hay productos en el ticket");
      return;
    }

    if (total <= 0) {
      setError("El total debe ser mayor a 0");
      return;
    }

    if (!payments || payments.length === 0) {
      setError("Debes especificar al menos una forma de pago");
      return;
    }

    if (Math.abs(totalPayments - total) > 0.01) {
      setError(
        `La suma de las formas de pago (${formatMoney(
          totalPayments
        )}) no coincide con el total (${formatMoney(total)}).`
      );
      return;
    }

    if (creditAmount > 0 && !selectedCustomer) {
      setError("Para usar Crédito en la venta debes seleccionar un cliente.");
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
        shiftId: currentShift._id,
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
        throw new Error(data.message || "Error al guardar venta");
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
          `Venta registrada correctamente. Folio: ${data.sale?.folio || ""}`
        );
      }

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
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("posOnlineOrderDraft");
      if (!raw) return;

      const draft: any = JSON.parse(raw);
      const rawItems = draft.items || draft.products || draft.cart || [];

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        window.localStorage.removeItem("posOnlineOrderDraft");
        return;
      }

      const mapped: CartItem[] = rawItems
        .map((it: any) => {
          const quantity = Number(it.quantity || 1);
          const unitPrice =
            Number(it.price) || Number(it.priceRetail) || 0;
          const subtotal = Number(it.subtotal) || quantity * unitPrice;
          const productId = it.productId || it._id || it.id || "";
          const name = it.name || it.productName || it.title || "";

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

      setCart(mapped);
      setDiscount(0);
      setPayments([{ method: "Efectivo", amount: 0 }]);
      setSelectedCustomerId("");
      setSelectedCustomer(null);
      setSearchTerm("");
      setOnlineOrderId(draft.orderId || draft.id || null);

      setSuccess(
        `Pedido en línea cargado${
          draft.orderId ? ` (folio web: ${draft.orderId})` : ""
        }. Ahora solo cobra y guarda la venta.`
      );
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("posOnlineOrderDraft");
      }
    }
  }, []);

  if (sessionLoading || shiftLoading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <p className="text-sm text-slate-600">
              Cargando sesión y turno...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h1 className="text-xl font-bold text-slate-900">
              Debes iniciar sesión
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Tu sesión no está activa.
            </p>
            <div className="mt-4">
              <Link
                href="/login"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
              >
                Ir a login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionUser.permissions?.canSell) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h1 className="text-xl font-bold text-slate-900">
              Sin permiso para vender
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Tu usuario no tiene permiso para usar el POS.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/admin/dashboard"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
              >
                Ir al panel
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow hover:bg-slate-300"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentShift) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h1 className="text-xl font-bold text-slate-900">
              Iniciar turno
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Bienvenido{" "}
              <span className="font-semibold">{sessionUser.username}</span>.
              Antes de vender, debes iniciar tu turno.
            </p>

            {error && (
              <div className="mt-4 rounded-md bg-red-100 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-md bg-emerald-100 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
                {success}
              </div>
            )}

            <form onSubmit={handleOpenShift} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Provisión inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialCash}
                  onChange={(e) => setInitialCash(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={openingShift}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:bg-slate-400"
                >
                  {openingShift ? "Iniciando..." : "Iniciar turno"}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow hover:bg-slate-300"
                >
                  Salir
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl grid gap-4 md:grid-cols-[2fr,1.4fr]">
        <section className="rounded-xl bg-white p-4 shadow-md md:p-5 flex flex-col">
          <header className="mb-3 w-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Punto de venta
                </h1>
                <p className="text-xs text-slate-600">
                  Super Tienda Tenay POS – Venta rápida, con crédito y formas
                  de pago combinadas.
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
                <span className="text-[11px] text-slate-600">
                  Cajero:{" "}
                  <span className="font-semibold">
                    {sessionUser.username}
                  </span>{" "}
                  · Rol:{" "}
                  <span className="font-semibold">{sessionUser.role}</span>
                </span>
                <span className="text-[11px] text-slate-600">
                  Turno abierto · Fondo inicial:{" "}
                  <span className="font-semibold">
                    {formatMoney(currentShift.initialCash || 0)}
                  </span>
                </span>

                <div className="flex items-center gap-2">
                  {lastSaleFolio && (
                    <span className="text-[10px] text-emerald-700">
                      Última venta: {lastSaleFolio}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={closingShift}
                    className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-400"
                  >
                    {closingShift ? "Cerrando..." : "Cerrar sesión"}
                  </button>
                </div>
              </div>
            </div>

            <nav className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow">
                POS / Venta
              </span>

              {sessionUser.permissions.canManageProducts && (
                <Link
                  href="/admin/products"
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
                >
                  Productos
                </Link>
              )}

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

              {sessionUser.permissions.canDoCashCuts && (
                <Link
                  href="/admin/corte"
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
                >
                  Corte de caja
                </Link>
              )}

              <Link
                href="/admin/reservas"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Reservas
              </Link>

              <Link
                href="/admin/online-orders"
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
              >
                Pedidos en línea
              </Link>

              {sessionUser.permissions.canSeeReports && (
                <Link
                  href="/admin/reports"
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
                >
                  Reportes
                </Link>
              )}

              {sessionUser.permissions.canManageUsers && (
                <Link
                  href="/admin/users"
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
                >
                  Usuarios
                </Link>
              )}

              {sessionUser.permissions.canAccessConfig && (
                <Link
                  href="/admin/config"
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-200"
                >
                  Configuración
                </Link>
              )}

              {sessionUser.permissions.canManageProducts && (
                <Link
                  href="/admin/inventory"
                  className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Inventario
                </Link>
              )}
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
                  const hasVariants = p.variants && p.variants.length > 0;

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
                            const vLabel = vt.join(" / ") || "Variante";

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => addProductToCart(p, v)}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-left hover:bg-slate-50 flex items-center justify-between"
                              >
                                <span>{vLabel}</span>
                                <span className="font-semibold text-emerald-700">
                                  {formatMoney(
                                    v.priceRetail || p.priceRetail || 0
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

        <section className="rounded-xl bg-white p-4 shadow-md md:p-5 flex flex-col">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">
            Ticket actual
          </h2>

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
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-1 py-1 align-top">
                        <div className="font-semibold">{item.name}</div>
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
                            updateCartQuantity(idx, Number(e.target.value))
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
                          onClick={() => removeCartItem(idx)}
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
                onChange={(e) => setSelectedCustomerId(e.target.value)}
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
                    {formatMoney(selectedCustomer.creditLimit || 0)}
                  </span>{" "}
                  · Saldo actual:{" "}
                  <span className="font-semibold text-red-600">
                    {formatMoney(selectedCustomer.currentBalance || 0)}
                  </span>
                </div>
              )}

              {creditAmount > 0 && !selectedCustomer && (
                <div className="mt-1 text-[10px] text-red-600">
                  Para usar Crédito debes seleccionar un cliente.
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-2 space-y-1 bg-slate-50">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatMoney(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Descuento:</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-20 rounded border border-slate-300 px-2 py-1 text-[11px] text-right outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>Total:</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

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
                        updatePaymentMethod(idx, e.target.value)
                      }
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta – Crédito">
                        Tarjeta – Crédito
                      </option>
                      <option value="Tarjeta – Débito">
                        Tarjeta – Débito
                      </option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="MercadoPago">MercadoPago</option>
                      <option value="Crédito">Crédito</option>
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] text-right outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={p.amount}
                      onChange={(e) =>
                        updatePaymentAmount(idx, Number(e.target.value))
                      }
                    />

                    <button
                      type="button"
                      onClick={() => removePaymentRow(idx)}
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
                disabled={savingSale || cart.length === 0 || total <= 0}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {savingSale ? "Guardando venta..." : "Cobrar y guardar venta"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}