import { connectDB } from "@/lib/db";
import { Sale } from "@/lib/models/Sale";

async function getDashboardData() {
  await connectDB();

  const now = new Date();

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  // Ventas del día
  const todaySales = await Sale.find({
    status: { $ne: "cancelled" },
    createdAt: { $gte: startOfDay },
  }).lean();

  // Ventas del mes
  const monthSales = await Sale.find({
    status: { $ne: "cancelled" },
    createdAt: { $gte: startOfMonth },
  }).lean();

  const sumTotal = (sales: any[]) =>
    sales.reduce(
      (acc, s) => acc + Number(s.total || 0),
      0
    );

  const todayTotal = sumTotal(todaySales);
  const monthTotal = sumTotal(monthSales);

  const todayCount = todaySales.length;
  const monthCount = monthSales.length;

  // Top productos del mes
  const productMap = new Map<
    string,
    { name: string; qty: number; total: number }
  >();

  for (const sale of monthSales as any[]) {
    const items = sale.items || [];
    for (const item of items) {
      const key = `${item.productId || item.name}`;
      const prev = productMap.get(key) || {
        name:
          item.name ||
          String(item.productId) ||
          "SIN NOMBRE",
        qty: 0,
        total: 0,
      };
      const qty = Number(item.quantity || 1);
      const subtotal = Number(
        item.subtotal ?? item.price * qty
      );
      productMap.set(key, {
        ...prev,
        qty: prev.qty + qty,
        total: prev.total + subtotal,
      });
    }
  }

  const topProducts = Array.from(
    productMap.values()
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    todayTotal,
    todayCount,
    monthTotal,
    monthCount,
    topProducts,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard de ventas
            </h1>
            <p className="text-sm text-slate-600">
              Resumen rápido de ventas del día y del mes,
              con los productos más vendidos.
            </p>
          </div>
          <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-slate-900 shadow">
            Super Tienda Tenay POS
          </span>
        </header>

        {/* Cards de resumen */}
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-md">
            <div className="text-[11px] text-slate-500">
              Ventas hoy
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              ${data.todayTotal.toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {data.todayCount} tickets
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md">
            <div className="text-[11px] text-slate-500">
              Ventas este mes
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              ${data.monthTotal.toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {data.monthCount} tickets
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md">
            <div className="text-[11px] text-slate-500">
              Ticket promedio hoy
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              $
              {data.todayCount
                ? (data.todayTotal / data.todayCount).toFixed(
                    2
                  )
                : "0.00"}
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md">
            <div className="text-[11px] text-slate-500">
              Ticket promedio mes
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              $
              {data.monthCount
                ? (data.monthTotal /
                    data.monthCount
                  ).toFixed(2)
                : "0.00"}
            </div>
          </div>
        </section>

        {/* Top productos */}
        <section className="rounded-xl bg-white p-4 shadow-md md:p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Top 5 productos del mes (por venta)
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aún no hay ventas este mes.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">
                      Producto
                    </th>
                    <th className="px-2 py-2 text-right">
                      Cantidad
                    </th>
                    <th className="px-2 py-2 text-right">
                      Importe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-2 py-2">
                        {p.name}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {p.qty}
                      </td>
                      <td className="px-2 py-2 text-right">
                        ${p.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
