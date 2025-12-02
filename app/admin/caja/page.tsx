"use client";

import { FormEvent, useEffect, useState } from "react";

type Breakdown = {
  openings: number;
  incomes: number;
  expenses: number;
  customerPayments: number;
  adjustments: number;
};

type Summary = {
  from: string;
  to: string;
  cashFromSales: number;
  totalIn: number;
  totalOut: number;
  theoreticalCash: number;
  breakdown: Breakdown;
  lastCut?: {
    folio: string;
    createdAt: string;
  } | null;
};

type MovementType =
  | "opening"
  | "income"
  | "expense"
  | "adjustment";

export default function CashBoxPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [movementType, setMovementType] =
    useState<MovementType>("income");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [savingMovement, setSavingMovement] =
    useState(false);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function loadSummary() {
    try {
      setLoadingSummary(true);
      clearMessages();
      const res = await fetch("/api/cashbox/summary");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || "No se pudo cargar resumen de caja"
        );
      }
      setSummary(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar resumen");
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  async function handleMovementSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (!amount || amount <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    try {
      setSavingMovement(true);
      setLoading(true);
      const res = await fetch("/api/cashmovements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movementType,
          amount,
          description,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message ||
            "Error al registrar movimiento de caja"
        );
      }

      setSuccess("Movimiento de caja registrado");
      setAmount(0);
      setDescription("");
      await loadSummary();
    } catch (e: any) {
      setError(e.message || "Error al registrar movimiento");
    } finally {
      setSavingMovement(false);
      setLoading(false);
    }
  }

  function formatMoney(n?: number) {
    return `$${Number(n || 0).toFixed(2)}`;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Caja y movimientos
            </h1>
            <p className="text-sm text-slate-600">
              Registra aperturas, ingresos, gastos y consulta
              el saldo teórico de caja desde el último corte.
            </p>
          </div>
          <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
            Super Tienda Tenay POS
          </span>
        </header>

        {/* MENSAJES */}
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

        {/* RESUMEN DE CAJA */}
        <section className="grid gap-4 md:grid-cols-[2fr,1.4fr]">
          {/* Resumen */}
          <div className="rounded-xl bg-white p-4 shadow-md md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Resumen desde último corte
              </h2>
              {loadingSummary && (
                <span className="text-[11px] text-slate-500">
                  Calculando...
                </span>
              )}
            </div>

            {!summary ? (
              <p className="text-sm text-slate-500">
                No hay datos aún. Realiza ventas o genera un
                corte para iniciar el seguimiento.
              </p>
            ) : (
              <div className="space-y-3 text-xs">
                {summary.lastCut ? (
                  <div className="text-[11px] text-slate-600">
                    Último corte:{" "}
                    <span className="font-semibold">
                      {summary.lastCut.folio}
                    </span>{" "}
                    el{" "}
                    {new Date(
                      summary.lastCut.createdAt
                    ).toLocaleString("es-MX")}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600">
                    No hay cortes previos. Se toman todos los
                    datos desde el inicio.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[11px] text-slate-500">
                      Efectivo de ventas
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {formatMoney(
                        summary.cashFromSales
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Pagos con forma de pago{" "}
                      <strong>"Efectivo"</strong>{" "}
                      desde el último corte.
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[11px] text-slate-500">
                      Movimientos netos
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {formatMoney(
                        summary.totalIn -
                          summary.totalOut
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Entradas – salidas de caja
                      manuales.
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 my-2" />

                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-semibold">
                    Saldo teórico de caja
                  </div>
                  <div className="text-xl font-bold text-emerald-700">
                    {formatMoney(
                      summary.theoreticalCash
                    )}
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 my-2" />

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">
                      Aperturas
                    </div>
                    <div className="font-semibold">
                      {formatMoney(
                        summary.breakdown.openings
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">
                      Ingresos
                    </div>
                    <div className="font-semibold">
                      {formatMoney(
                        summary.breakdown.incomes
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">
                      Gastos
                    </div>
                    <div className="font-semibold text-red-600">
                      {formatMoney(
                        summary.breakdown.expenses
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">
                      Abonos clientes
                    </div>
                    <div className="font-semibold">
                      {formatMoney(
                        summary.breakdown
                          .customerPayments
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-slate-500">
                      Ajustes
                    </div>
                    <div className="font-semibold">
                      {formatMoney(
                        summary.breakdown.adjustments
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  El saldo teórico incluye: efectivo de
                  ventas + aperturas + ingresos + abonos de
                  clientes – gastos – ajustes negativos.
                </div>
              </div>
            )}
          </div>

          {/* Registrar movimiento */}
          <div className="rounded-xl bg-white p-4 shadow-md md:p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">
              Registrar movimiento de caja
            </h2>
            <p className="text-[11px] text-slate-600 mb-3">
              Usa <strong>Apertura</strong> para el inicio de
              turno, <strong>Ingreso</strong> para entradas de
              efectivo (no ventas), <strong>Gasto</strong> para
              salidas (compras, pagos) y{" "}
              <strong>Ajuste</strong> para correcciones
              especiales.
            </p>

            <form
              onSubmit={handleMovementSubmit}
              className="space-y-3 text-xs"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Tipo de movimiento
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={movementType}
                    onChange={(e) =>
                      setMovementType(
                        e.target.value as MovementType
                      )
                    }
                  >
                    <option value="opening">
                      Apertura de caja
                    </option>
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                    <option value="adjustment">
                      Ajuste
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={amount}
                    onChange={(e) =>
                      setAmount(Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Ej. Gasto de papelería, Ingreso por depósito en caja, etc."
                />
              </div>

              <button
                type="submit"
                disabled={savingMovement}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed"
              >
                {savingMovement
                  ? "Guardando..."
                  : "Registrar movimiento"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
