import Link from "next/link";

export default function InventoryMenuPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Inventario
            </h1>
            <p className="text-sm text-slate-600">
              Módulo de inventario de Super Tienda Tenay POS. Elige
              qué operación quieres realizar.
            </p>
          </div>
          <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
            Super Tienda Tenay POS
          </span>
        </header>

        {/* Grid de accesos */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Agregar inventario */}
          <Link
            href="/admin/inventory/add"
            className="group rounded-xl bg-white p-4 shadow-md border border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Agregar inventario
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Entrada de mercancía. Escanea el código, captura
                cantidad, costo y precios.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-emerald-700 group-hover:underline">
              Ir a agregar inventario →
            </div>
          </Link>

          {/* Ajuste inventario */}
          <Link
            href="/admin/inventory/adjust"
            className="group rounded-xl bg-white p-4 shadow-md border border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Ajuste de inventario
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Ajustes positivos o negativos por diferencias de
                conteo, mermas o correcciones.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-emerald-700 group-hover:underline">
              Ir a ajuste de inventario →
            </div>
          </Link>

          {/* Productos bajos */}
          <Link
            href="/admin/inventory/low-stock"
            className="group rounded-xl bg-white p-4 shadow-md border border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Productos bajos en inventario
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Lista de productos con existencia por debajo del
                mínimo configurado.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-emerald-700 group-hover:underline">
              Ver productos bajos →
            </div>
          </Link>

          {/* Reporte de inventario */}
          <Link
            href="/admin/inventory/report"
            className="group rounded-xl bg-white p-4 shadow-md border border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Reporte de inventario
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Existencias, costo total y valor de inventario por
                producto.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-emerald-700 group-hover:underline">
              Ver reporte de inventario →
            </div>
          </Link>

          {/* Kardex */}
          <Link
            href="/admin/inventory/kardex"
            className="group rounded-xl bg-white p-4 shadow-md border border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Kardex de inventario
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Entradas, salidas y existencias por producto y
                periodo.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-emerald-700 group-hover:underline">
              Ir al Kardex →
            </div>
          </Link>

          {/* Volver al POS */}
          <Link
            href="/pos"
            className="group rounded-xl bg-slate-900 p-4 shadow-md border border-slate-900 hover:bg-slate-800 transition-all flex flex-col justify-between"
          >
            <div>
              <h2 className="text-sm font-semibold text-white">
                Volver al punto de venta
              </h2>
              <p className="mt-1 text-xs text-slate-200">
                Regresar rápidamente a la pantalla de cobro.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-yellow-300 group-hover:underline">
              Ir al POS →
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
