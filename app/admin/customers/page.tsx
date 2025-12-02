"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

type Customer = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  creditLimit?: number;
  currentBalance?: number;
  isActive?: boolean;
  createdAt?: string;
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Para mostrar link al último ticket de abono
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [lastPaymentCustomerName, setLastPaymentCustomerName] =
    useState<string | null>(null);

  // Filtro
  const [query, setQuery] = useState("");

  // Form nuevo cliente
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    creditLimit: 0,
  });

  // Abono
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Efectivo");
  const [paymentNote, setPaymentNote] = useState("");
  const [createCashMovement, setCreateCashMovement] =
    useState(true);
  const [savingPayment, setSavingPayment] = useState(false);

  function clearMessages() {
    setError(null);
    setSuccess(null);
    setLastPaymentId(null);
    setLastPaymentCustomerName(null);
  }

  async function loadCustomers() {
    try {
      setLoading(true);
      const url = query
        ? `/api/customers?q=${encodeURIComponent(query)}`
        : "/api/customers";
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "No se pudieron cargar clientes"
        );
      }
      const data = await res.json();
      setCustomers(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateCustomer(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (!newCustomer.name.trim()) {
      setError("El nombre del cliente es obligatorio");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || "Error al crear cliente"
        );
      }

      setSuccess("Cliente creado correctamente");
      setNewCustomer({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
        creditLimit: 0,
      });
      await loadCustomers();
    } catch (e: any) {
      setError(e.message || "Error al crear cliente");
    } finally {
      setSaving(false);
    }
  }

  function openPaymentModal(customer: Customer) {
    setError(null);
    setSuccess(null);
    setLastPaymentId(null);
    setLastPaymentCustomerName(null);

    setSelectedCustomer(customer);
    setPaymentAmount(
      Number(customer.currentBalance || 0) > 0
        ? Number(customer.currentBalance || 0)
        : 0
    );
    setPaymentMethod("Efectivo");
    setPaymentNote("");
    setCreateCashMovement(true);
  }

  function closePaymentModal() {
    setSelectedCustomer(null);
    setPaymentAmount(0);
    setPaymentMethod("Efectivo");
    setPaymentNote("");
    setCreateCashMovement(true);
  }

  async function handlePaymentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    setError(null);
    setSuccess(null);
    setLastPaymentId(null);
    setLastPaymentCustomerName(null);

    if (!paymentAmount || paymentAmount <= 0) {
      setError("El monto del abono debe ser mayor a 0");
      return;
    }

    try {
      setSavingPayment(true);
      const res = await fetch(
        `/api/customers/${selectedCustomer._id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: paymentAmount,
            method: paymentMethod,
            note: paymentNote,
            createCashMovement,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || "Error al registrar abono"
        );
      }

      const paymentId = data.payment?._id as string | undefined;
      const customerNameFromResponse =
        data.customer?.name as string | undefined;

      setLastPaymentId(paymentId || null);
      setLastPaymentCustomerName(
        customerNameFromResponse ||
          selectedCustomer.name ||
          null
      );

      setSuccess("Abono registrado correctamente");
      closePaymentModal();
      await loadCustomers();
    } catch (e: any) {
      setError(e.message || "Error al registrar abono");
    } finally {
      setSavingPayment(false);
    }
  }

  function formatMoney(value?: number) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
                {/* HEADER */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Clientes y créditos
            </h1>
            <p className="text-sm text-slate-600">
              Administra tus clientes, sus saldos pendientes y
              registra abonos a crédito.
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


        {/* MENSAJES */}
        {error && (
          <div className="rounded-md bg-red-100 border border-red-200 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-emerald-100 border border-emerald-200 px-4 py-2 text-xs text-emerald-800 flex flex-wrap items-center gap-2">
            <span>{success}</span>
            {lastPaymentId && (
              <>
                <span className="text-[10px] text-slate-500">
                  ·
                </span>
                <Link
                  href={`/ticket-abono/${lastPaymentId}`}
                  target="_blank"
                  className="text-[11px] font-semibold text-emerald-700 underline"
                >
                  Ver ticket de abono
                  {lastPaymentCustomerName
                    ? ` (${lastPaymentCustomerName})`
                    : ""}
                </Link>
              </>
            )}
          </div>
        )}

        {/* NUEVO CLIENTE */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Nuevo cliente
            </h2>
            {loading && (
              <span className="text-[11px] text-slate-500">
                Cargando clientes...
              </span>
            )}
          </div>

          <form
            onSubmit={handleCreateCustomer}
            className="grid gap-4 md:grid-cols-4"
          >
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Teléfono
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    phone: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Límite de crédito
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={newCustomer.creditLimit}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    creditLimit: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="md:col-span-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Correo
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      email: e.target.value,
                    })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Dirección
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      address: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Notas
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={newCustomer.notes}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    notes: e.target.value,
                  })
                }
              />
            </div>

            <div className="md:col-span-1 flex items-end justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed w-full md:w-auto"
              >
                {saving ? "Guardando..." : "Guardar cliente"}
              </button>
            </div>
          </form>
        </section>

        {/* LISTA DE CLIENTES */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Lista de clientes
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                className="w-full md:w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    loadCustomers();
                  }
                }}
              />
              <button
                type="button"
                onClick={loadCustomers}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-800"
              >
                Buscar
              </button>
            </div>
          </div>

          {customers.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay clientes registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">
                      Cliente
                    </th>
                    <th className="px-2 py-2 text-left">
                      Teléfono
                    </th>
                    <th className="px-2 py-2 text-right">
                      Límite
                    </th>
                    <th className="px-2 py-2 text-right">
                      Saldo actual
                    </th>
                    <th className="px-2 py-2 text-center">
                      Estado
                    </th>
                    <th className="px-2 py-2 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-2 py-2">
                        <div className="font-semibold">
                          {c.name}
                        </div>
                        {c.notes && (
                          <div className="text-[10px] text-slate-500">
                            {c.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {c.phone || "-"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatMoney(c.creditLimit)}
                      </td>
                      <td
                        className={`px-2 py-2 text-right ${
                          (c.currentBalance || 0) > 0
                            ? "text-red-600 font-semibold"
                            : "text-emerald-700"
                        }`}
                      >
                        {formatMoney(c.currentBalance)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {c.isActive ? "Activo" : "Inactivo"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => openPaymentModal(c)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white shadow hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                          disabled={
                            Number(c.currentBalance || 0) <= 0
                          }
                        >
                          Registrar abono
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* MODAL ABONO */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg md:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  Abono a cliente
                </h2>
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cerrar ✕
                </button>
              </div>

              <div className="mb-3 text-xs">
                <div className="font-semibold">
                  {selectedCustomer.name}
                </div>
                <div className="text-slate-500">
                  Saldo actual:{" "}
                  <span className="font-semibold text-red-600">
                    {formatMoney(
                      selectedCustomer.currentBalance
                    )}
                  </span>
                </div>
              </div>

              <form
                onSubmit={handlePaymentSubmit}
                className="space-y-3 text-xs"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Monto del abono
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={paymentAmount}
                      onChange={(e) =>
                        setPaymentAmount(
                          Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Forma de pago
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as PaymentMethod
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
                      <option value="Mixto">Mixto</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Nota (opcional)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={paymentNote}
                    onChange={(e) =>
                      setPaymentNote(e.target.value)
                    }
                    placeholder="Ej. Abono a saldo de compra de cosméticos."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="createCashMovement"
                    type="checkbox"
                    checked={createCashMovement}
                    onChange={(e) =>
                      setCreateCashMovement(
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="createCashMovement"
                    className="text-[11px] text-slate-700"
                  >
                    Registrar también como entrada de caja
                    (efectivo/real).
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    {savingPayment
                      ? "Guardando..."
                      : "Registrar abono"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
