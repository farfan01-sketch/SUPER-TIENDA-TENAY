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
  creditDays?: number;
  currentBalance?: number;
  isActive?: boolean;
  createdAt?: string;
};

type CustomerForm = {
  _id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  creditLimit: number;
  creditDays: number;
  isActive: boolean;
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

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  creditLimit: 0,
  creditDays: 0,
  isActive: true,
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [lastPaymentCustomerName, setLastPaymentCustomerName] =
    useState<string | null>(null);

  const [query, setQuery] = useState("");

  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Efectivo");
  const [paymentNote, setPaymentNote] = useState("");
  const [createCashMovement, setCreateCashMovement] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);

  function clearMessages() {
    setError(null);
    setSuccess(null);
    setLastPaymentId(null);
    setLastPaymentCustomerName(null);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingCustomer(null);
  }

  function formatMoney(value?: number) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  async function loadCustomers() {
    try {
      setLoading(true);
      const url = query
        ? `/api/customers?q=${encodeURIComponent(query)}`
        : "/api/customers";

      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudieron cargar clientes");
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

  async function handleSaveCustomer(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (!form.name.trim()) {
      setError("El nombre del cliente es obligatorio");
      return;
    }

    try {
      setSaving(true);

      const isEditing = Boolean(editingCustomer?._id);

      const res = await fetch("/api/customers", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editingCustomer?._id,
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          notes: form.notes,
          creditLimit: form.creditLimit,
          creditDays: form.creditDays,
          isActive: form.isActive,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.message ||
            (isEditing ? "Error al modificar cliente" : "Error al crear cliente")
        );
      }

      setSuccess(isEditing ? "Cliente modificado correctamente" : "Cliente creado correctamente");
      resetForm();
      await loadCustomers();
    } catch (e: any) {
      setError(e.message || "Error al guardar cliente");
    } finally {
      setSaving(false);
    }
  }

  function handleEditCustomer(customer: Customer) {
    clearMessages();
    setEditingCustomer(customer);
    setForm({
      _id: customer._id,
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
      creditLimit: Number(customer.creditLimit || 0),
      creditDays: Number(customer.creditDays || 0),
      isActive: customer.isActive !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteCustomer(customer: Customer) {
    clearMessages();

    if (Number(customer.currentBalance || 0) > 0) {
      setError(
        "No puedes eliminar un cliente con saldo pendiente. Primero registra el abono o márcalo como inactivo."
      );
      return;
    }

    const ok = window.confirm(
      `¿Seguro que deseas eliminar al cliente "${customer.name}"?`
    );

    if (!ok) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/customers?id=${customer._id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Error al eliminar cliente");
      }

      setSuccess("Cliente eliminado correctamente");
      await loadCustomers();
    } catch (e: any) {
      setError(e.message || "Error al eliminar cliente");
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
        throw new Error(data.message || "Error al registrar abono");
      }

      const paymentId = data.payment?._id as string | undefined;
      const customerNameFromResponse =
        data.customer?.name as string | undefined;

      setLastPaymentId(paymentId || null);
      setLastPaymentCustomerName(
        customerNameFromResponse || selectedCustomer.name || null
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

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Clientes y créditos
            </h1>
            <p className="text-sm text-slate-600">
              Administra clientes, límites, días de crédito, saldos y abonos.
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
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-100 px-4 py-2 text-xs text-emerald-800">
            <span>{success}</span>
            {lastPaymentId && (
              <Link
                href={`/ticket-abono/${lastPaymentId}`}
                target="_blank"
                className="text-[11px] font-semibold text-emerald-700 underline"
              >
                Ver ticket de abono
                {lastPaymentCustomerName ? ` (${lastPaymentCustomerName})` : ""}
              </Link>
            )}
          </div>
        )}

        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              {editingCustomer ? "Modificar cliente" : "Nuevo cliente"}
            </h2>

            {editingCustomer && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <form
            onSubmit={handleSaveCustomer}
            className="grid gap-4 md:grid-cols-4"
          >
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Teléfono
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                value={form.creditLimit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    creditLimit: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Días de crédito
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.creditDays}
                onChange={(e) =>
                  setForm({
                    ...form,
                    creditDays: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Correo
              </label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Dirección
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Notas
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <label
                htmlFor="isActive"
                className="text-xs font-medium text-slate-700"
              >
                Cliente activo
              </label>
            </div>

            <div className="md:col-span-4 flex justify-end gap-2">
              {editingCustomer && (
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
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {saving
                  ? "Guardando..."
                  : editingCustomer
                  ? "Guardar cambios"
                  : "Guardar cliente"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Lista de clientes
            </h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:w-64"
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

          {loading ? (
            <p className="text-sm text-slate-500">Cargando clientes...</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay clientes registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">Cliente</th>
                    <th className="px-2 py-2 text-left">Teléfono</th>
                    <th className="px-2 py-2 text-right">Límite</th>
                    <th className="px-2 py-2 text-center">Días</th>
                    <th className="px-2 py-2 text-right">Saldo</th>
                    <th className="px-2 py-2 text-center">Estado</th>
                    <th className="px-2 py-2 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-2 py-2">
                        <div className="font-semibold">{c.name}</div>
                        {c.notes && (
                          <div className="text-[10px] text-slate-500">
                            {c.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-2">{c.phone || "-"}</td>

                      <td className="px-2 py-2 text-right">
                        {formatMoney(c.creditLimit)}
                      </td>

                      <td className="px-2 py-2 text-center">
                        {Number(c.creditDays || 0)}
                      </td>

                      <td
                        className={`px-2 py-2 text-right ${
                          Number(c.currentBalance || 0) > 0
                            ? "font-semibold text-red-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {formatMoney(c.currentBalance)}
                      </td>

                      <td className="px-2 py-2 text-center">
                        {c.isActive ? "Activo" : "Inactivo"}
                      </td>

                      <td className="px-2 py-2">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openPaymentModal(c)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                            disabled={Number(c.currentBalance || 0) <= 0}
                          >
                            Abono
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditCustomer(c)}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white shadow hover:bg-blue-700"
                          >
                            Modificar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(c)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-semibold text-white shadow hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedCustomer && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg md:p-6">
              <div className="mb-3 flex items-center justify-between">
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
                <div className="font-semibold">{selectedCustomer.name}</div>
                <div className="text-slate-500">
                  Saldo actual:{" "}
                  <span className="font-semibold text-red-600">
                    {formatMoney(selectedCustomer.currentBalance)}
                  </span>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
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
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
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
                        setPaymentMethod(e.target.value as PaymentMethod)
                      }
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta – Crédito">Tarjeta – Crédito</option>
                      <option value="Tarjeta – Débito">Tarjeta – Débito</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="MercadoPago">MercadoPago</option>
                      <option value="Mixto">Mixto</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Nota
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="createCashMovement"
                    type="checkbox"
                    checked={createCashMovement}
                    onChange={(e) => setCreateCashMovement(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label
                    htmlFor="createCashMovement"
                    className="text-[11px] text-slate-700"
                  >
                    Registrar también como entrada de caja.
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
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {savingPayment ? "Guardando..." : "Registrar abono"}
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