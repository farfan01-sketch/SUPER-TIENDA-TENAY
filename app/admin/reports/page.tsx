"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Permissions = {
  canSell: boolean;
  canManageProducts: boolean;
  canSeeReports: boolean;
  canDoCashCuts: boolean;
  canCancelSales: boolean;
  canManageUsers: boolean;
  canAccessConfig: boolean;
};

type SessionUser = {
  _id: string;
  username: string;
  role: "admin" | "supervisor" | "encargado" | "cajero";
  permissions: Permissions;
};

type Summary = {
  date: string;
  totalSales: number;
  totalCost: number;
  profit: number;
  salesCount: number;
  inventoryCostValue: number;
  inventoryRetailValue: number;
};

export default function ReportsPage() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function loadSummary(selectedDate: string) {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch(`/api/reports/summary?date=${selectedDate}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo cargar el resumen");
      }

      const data = await res.json();
      setSummary(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar resumen");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (!sessionLoading && sessionUser?.permissions?.canSeeReports) {
      loadSummary(date);
    }
  }, [sessionLoading, sessionUser, date]);

  const handleChangeDate = (value: string) => {
    setDate(value);
  };

  const formatMoney = (value: number | undefined | null) => {
    const num = value || 0;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    });
  };

  const formattedDate =
    summary?.date
      ? new Date(summary.date).toLocaleDateString("es-MX", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "";

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <p className="text-sm text-slate-600">Cargando permisos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h1 className="text-xl font-bold text-slate-900">
              Acceso denegado
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Debes iniciar sesión para ver esta sección.
            </p>
            <div className="mt-4">
              <Link
                href="/login"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionUser.permissions?.canSeeReports) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h1 className="text-xl font-bold text-slate-900">
              Sin permiso para reportes
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Tu usuario no tiene permiso para ver reportes.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/pos"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
              >
                Ir al POS
              </Link>
              <Link
                href="/admin/dashboard"
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow hover:bg-slate-300"
              >
                Ir al panel
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Reportes – Super Tienda Tenay
            </h1>
            <p className="text-sm text-slate-600">
              Resumen de ventas, ganancia del día y valor de inventario.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
              Panel de reportes
            </span>
            <Link
              href="/pos"
              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-slate-800"
            >
              Ir al POS
            </Link>
          </div>
        </header>

        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Fecha del reporte
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => handleChangeDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {formattedDate && (
                <p className="mt-1 text-xs text-slate-500">
                  Mostrando datos del{" "}
                  <span className="font-semibold">{formattedDate}</span>
                </p>
              )}
            </div>

            {loading && (
              <span className="text-xs text-slate-500">
                Calculando resumen...
              </span>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-100 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {!error && summary && (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  Ventas del día
                </h3>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatMoney(summary.totalSales)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Número de tickets:{" "}
                  <span className="font-semibold">{summary.salesCount}</span>
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  Costo de mercancía vendida
                </h3>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatMoney(summary.totalCost)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Basado en el costo registrado al momento de la venta.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-emerald-50 p-4">
                <h3 className="text-xs font-semibold uppercase text-emerald-700">
                  Ganancia del día
                </h3>
                <p className="mt-2 text-2xl font-bold text-emerald-800">
                  {formatMoney(summary.profit)}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  Ventas – costo de mercancía vendida.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  Valor inventario a costo
                </h3>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatMoney(summary.inventoryCostValue)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Calculado con stock actual × costo.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  Valor inventario a precio de venta
                </h3>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatMoney(summary.inventoryRetailValue)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Stock actual × precio menudeo.
                </p>
              </div>
            </div>
          )}

          {!error && !summary && !loading && (
            <p className="mt-6 text-sm text-slate-500">
              No hay datos para la fecha seleccionada.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}