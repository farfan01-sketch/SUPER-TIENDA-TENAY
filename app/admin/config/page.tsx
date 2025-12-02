"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Config = {
  _id?: string;
  storeName: string;
  address?: string;
  phone?: string;
  taxId?: string;
  logoPath?: string;
  ticketFooter?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function ConfigPage() {
  const [config, setConfig] = useState<Config>({
    storeName: "Super Tienda Tenay",
    address: "",
    phone: "",
    taxId: "",
    logoPath: "/uploads/logo.png",
    ticketFooter: "Gracias por su compra.",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function loadConfig() {
    try {
      setLoading(true);
      clearMessages();
      const res = await fetch("/api/config");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "No se pudo cargar la configuración"
        );
      }
      const data = await res.json();
      setConfig((prev) => ({
        ...prev,
        ...data,
      }));
    } catch (e: any) {
      setError(e.message || "Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (!config.storeName || !config.storeName.trim()) {
      setError("El nombre de la tienda es obligatorio");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "Error al guardar configuración"
        );
      }

      const data = await res.json();
      setConfig((prev) => ({ ...prev, ...data }));
      setSuccess("Configuración guardada correctamente");
    } catch (e: any) {
      setError(e.message || "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
                <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Configuración de la tienda
            </h1>
            <p className="text-sm text-slate-600">
              Define tu nombre comercial, datos de ticket y logo
              que se mostrará en tickets y reportes.
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

        <section className="rounded-xl bg-white p-4 shadow-md md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Datos generales
            </h2>
            {loading && (
              <span className="text-[11px] text-slate-500">
                Cargando...
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-emerald-100 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
              {success}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Nombre de la tienda *
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={config.storeName}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      storeName: e.target.value,
                    }))
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
                  value={config.phone || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Dirección
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  rows={2}
                  value={config.address || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  RFC / Identificación fiscal
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={config.taxId || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      taxId: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Logo */}
            <div className="grid gap-4 md:grid-cols-[2fr,1fr] items-start">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Ruta del logo (dentro de /public) *
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={config.logoPath || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      logoPath: e.target.value,
                    }))
                  }
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Ejemplo:{" "}
                  <span className="font-mono text-[11px]">
                    /uploads/logo.png
                  </span>{" "}
                  corresponde a{" "}
                  <span className="font-mono text-[11px]">
                    public/uploads/logo.png
                  </span>
                  .
                </p>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50">
                <span className="text-[11px] font-semibold text-slate-700">
                  Vista previa del logo
                </span>
                {config.logoPath ? (
                  <img
                    src={config.logoPath}
                    alt="Logo tienda"
                    className="max-h-20 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Sin logo configurado
                  </span>
                )}
              </div>
            </div>

            {/* Pie de ticket */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Mensaje al pie del ticket
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows={2}
                value={config.ticketFooter || ""}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    ticketFooter: e.target.value,
                  }))
                }
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Se mostrará al final del ticket y en algunos
                reportes impresos.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "Guardar configuración"}
              </button>
            </div>
          </form>
        </section>

        {/* Ayuda rápida */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">
            Ayuda rápida
          </h2>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
            <li>
              Copia tu archivo de logo a{" "}
              <span className="font-mono">
                public/uploads/logo.png
              </span>{" "}
              y usa{" "}
              <span className="font-mono">
                /uploads/logo.png
              </span>{" "}
              como ruta.
            </li>
            <li>
              Estos datos se podrán usar en tickets, reportes,
              cortes de caja y dashboard.
            </li>
            <li>
              Solo usuarios con permiso de{" "}
              <strong>Config</strong> pueden acceder a esta
              sección.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
