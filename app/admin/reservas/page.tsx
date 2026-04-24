"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ServiceType = "uñas" | "alaciado";

// ✅ Agregamos confirmado para poder disparar WhatsApp al confirmar
type BookingStatus = "reservado" | "confirmado" | "cancelado";

type Booking = {
  _id: string;
  date: string; // "2025-12-01"
  startTime: string; // "10:00"
  endTime: string; // "12:00"
  serviceType: ServiceType;
  customerName: string;
  customerPhone: string; // idealmente formato 52XXXXXXXXXX
  notes?: string;
  status: BookingStatus;
};

type Slot = {
  start: string;
  end: string;
};

type ScheduleConfig = {
  openHour: number;
  closeHour: number;
  slotDuration: number;
};

function generateSlots(config: ScheduleConfig): Slot[] {
  const slots: Slot[] = [];
  for (
    let h = config.openHour;
    h < config.closeHour;
    h += config.slotDuration
  ) {
    const start = `${h.toString().padStart(2, "0")}:00`;
    const end = `${(h + config.slotDuration).toString().padStart(2, "0")}:00`;
    slots.push({ start, end });
  }
  return slots;
}

const DEFAULT_CONFIG: ScheduleConfig = {
  openHour: 10,
  closeHour: 20,
  slotDuration: 2,
};

// ✅ “Grupos de horario” (presets)
const SCHEDULE_GROUPS: { key: string; label: string; config: ScheduleConfig }[] =
  [
    {
      key: "normal",
      label: "Horario normal (10–20 / 2h)",
      config: { openHour: 10, closeHour: 20, slotDuration: 2 },
    },
    {
      key: "amplio",
      label: "Horario amplio (09–21 / 2h)",
      config: { openHour: 9, closeHour: 21, slotDuration: 2 },
    },
    {
      key: "corto",
      label: "Horario corto (12–20 / 2h)",
      config: { openHour: 12, closeHour: 20, slotDuration: 2 },
    },
  ];

// Helpers
function safeUpperFirst(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AdminReservasPage() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState<string>(todayStr);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // configuración de horarios
  const [scheduleConfig, setScheduleConfig] =
    useState<ScheduleConfig>(DEFAULT_CONFIG);

  // ✅ selector de grupos
  const [selectedGroup, setSelectedGroup] = useState<string>("normal");

  const slots = useMemo(() => generateSlots(scheduleConfig), [scheduleConfig]);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function loadBookings(selectedDate: string) {
    try {
      clearMessages();
      setLoading(true);

      const res = await fetch(`/api/bookings?date=${selectedDate}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Error al cargar reservas");
      }

      const data: Booking[] = await res.json();
      setBookings(data);

      if (selectedBooking && !data.find((b) => b._id === selectedBooking._id)) {
        setSelectedBooking(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // ✅ Reservado + Confirmado se muestran en el slot
  function getBookingsForSlot(start: string): Booking[] {
    return bookings.filter(
      (b) =>
        b.startTime === start &&
        (b.status === "reservado" || b.status === "confirmado")
    );
  }

  function handleSelectBooking(b: Booking) {
    setSelectedBooking(b);
    clearMessages();
  }

  function handleChangeSelected<K extends keyof Booking>(
    field: K,
    value: Booking[K]
  ) {
    if (!selectedBooking) return;
    setSelectedBooking({
      ...selectedBooking,
      [field]: value,
    });
  }

  // ✅ Enviar WhatsApp helper (reusa tu endpoint /api/whatsapp/send-order)
  async function sendWhatsApp(to: string, message: string) {
    const wres = await fetch("/api/whatsapp/send-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
    });

    const wdata = await wres.json().catch(() => ({}));
    if (!wres.ok) {
      console.error("WhatsApp falló:", wdata);
      return { ok: false, data: wdata };
    }
    return { ok: true, data: wdata };
  }

  async function handleSaveBooking(options?: { notifyWhatsApp?: boolean }) {
    if (!selectedBooking) return;
    clearMessages();

    try {
      setSaving(true);

      const res = await fetch(`/api/bookings/${selectedBooking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedBooking.date,
          startTime: selectedBooking.startTime,
          endTime: selectedBooking.endTime,
          serviceType: selectedBooking.serviceType,
          customerName: selectedBooking.customerName,
          customerPhone: selectedBooking.customerPhone,
          notes: selectedBooking.notes,
          status: selectedBooking.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Error al guardar cambios");
      }

      // ✅ WhatsApp SOLO si se pide (confirmación/cancelación)
      if (options?.notifyWhatsApp) {
        const phone = (selectedBooking.customerPhone || "").trim();
        if (phone) {
          const msg =
            selectedBooking.status === "confirmado"
              ? `✨ Tu cita ha sido CONFIRMADA ✨

📅 Fecha: ${selectedBooking.date}
⏰ Hora: ${selectedBooking.startTime} - ${selectedBooking.endTime}
💅 Servicio: ${safeUpperFirst(selectedBooking.serviceType)}

Gracias por reservar con Super Tienda Tenay 💖`
              : selectedBooking.status === "cancelado"
              ? `⚠️ Tu cita fue CANCELADA

📅 Fecha: ${selectedBooking.date}
⏰ Hora: ${selectedBooking.startTime} - ${selectedBooking.endTime}
💅 Servicio: ${safeUpperFirst(selectedBooking.serviceType)}

Si deseas reagendar, entra a la página de reservas 🙌`
              : "";

          if (msg) {
            await sendWhatsApp(phone, msg);
          }
        } else {
          console.warn("No hay customerPhone para enviar WhatsApp");
        }
      }

      setSuccess("Cambios guardados correctamente.");
      await loadBookings(date);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al guardar la reserva");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetStatus(status: BookingStatus, notify = false) {
    if (!selectedBooking) return;
    handleChangeSelected("status", status);
    await handleSaveBooking({ notifyWhatsApp: notify });
  }

  function handleChangeScheduleField(
    field: keyof ScheduleConfig,
    value: number
  ) {
    setScheduleConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
    // si editas manual, el grupo pasa a "custom"
    setSelectedGroup("custom");
  }

  function applyScheduleGroup(groupKey: string) {
    setSelectedGroup(groupKey);
    const group = SCHEDULE_GROUPS.find((g) => g.key === groupKey);
    if (group) {
      setScheduleConfig(group.config);
    }
  }

  function statusBadge(status: BookingStatus) {
    if (status === "reservado") {
      return (
        <span className="rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700">
          Reservado
        </span>
      );
    }
    if (status === "confirmado") {
      return (
        <span className="rounded-full bg-yellow-100 border border-yellow-200 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
          Confirmado
        </span>
      );
    }
    return (
      <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
        Cancelado
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* HEADER */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Panel de reservas (admin)
            </h1>
            <p className="text-xs text-slate-600">
              Confirma (con WhatsApp), ajusta horarios o cancela citas de uñas y
              alaciados.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/pos"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800"
            >
              Ir al POS
            </Link>
          </div>
        </header>

        {/* FECHA Y MENSAJES */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Fecha:</label>
            <input
              type="date"
              className="border rounded px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1 text-xs">
            {loading && <span className="text-slate-500">Cargando reservas...</span>}
            {error && (
              <div className="rounded bg-red-100 px-3 py-1 text-red-700 border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded bg-emerald-100 px-3 py-1 text-emerald-800 border border-emerald-200">
                {success}
              </div>
            )}
          </div>
        </div>

        {/* LAYOUT PRINCIPAL */}
        <div className="grid gap-4 md:grid-cols-[2fr,1.3fr]">
          {/* COLUMNA IZQUIERDA: HORARIOS */}
          <section className="rounded-xl bg-white p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Horarios del día
              </h2>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Leyenda:</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-green-50 border border-emerald-200 text-emerald-700">
                  Libre
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700">
                  Reservado
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                  Confirmado
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {slots.map((slot) => {
                const slotBookings = getBookingsForSlot(slot.start);
                const hasBookings = slotBookings.length > 0;

                const isSelected =
                  !!selectedBooking && selectedBooking.startTime === slot.start;

                // si hay booking confirmado en ese slot, colorea amarillo
                const anyConfirmed = slotBookings.some((b) => b.status === "confirmado");

                const baseColor = hasBookings
                  ? anyConfirmed
                    ? "bg-yellow-50 border-yellow-300"
                    : "bg-red-50 border-red-300"
                  : "bg-green-50 border-emerald-300";

                return (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => {
                      if (hasBookings) {
                        handleSelectBooking(slotBookings[0]);
                      } else {
                        setSelectedBooking(null);
                      }
                    }}
                    className={`border rounded p-3 text-left text-xs transition ${baseColor} ${
                      isSelected ? "ring-2 ring-blue-400" : ""
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">
                      {slot.start} - {slot.end}
                    </div>

                    {hasBookings ? (
                      <div className="space-y-1">
                        {slotBookings.map((b) => (
                          <div
                            key={b._id}
                            className="border border-slate-200 rounded px-2 py-1 bg-white"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold">{b.customerName}</div>
                              {statusBadge(b.status)}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {b.serviceType} · Tel: {b.customerPhone}
                            </div>
                            {b.notes && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {b.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-700">Libre</div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* COLUMNA DERECHA: EDICIÓN Y CONFIGURACIÓN */}
          <section className="space-y-4">
            {/* PANEL EDICIÓN DE CITA */}
            <div className="rounded-xl bg-white p-4 shadow-md">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                Detalle de la cita
              </h2>

              {!selectedBooking ? (
                <p className="text-xs text-slate-500">
                  Selecciona una cita en los horarios de la izquierda para editarla.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-600">
                      ID: <span className="font-mono">{selectedBooking._id}</span>
                    </div>
                    {statusBadge(selectedBooking.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Fecha
                      </label>
                      <input
                        type="date"
                        className="w-full border rounded px-2 py-1"
                        value={selectedBooking.date.slice(0, 10)}
                        onChange={(e) =>
                          handleChangeSelected("date", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Horario
                      </label>
                      <select
                        className="w-full border rounded px-2 py-1"
                        value={selectedBooking.startTime}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          const slot = slots.find((s) => s.start === newStart);
                          if (!slot) return;
                          handleChangeSelected("startTime", slot.start);
                          handleChangeSelected("endTime", slot.end);
                        }}
                      >
                        {slots.map((s) => (
                          <option key={s.start} value={s.start}>
                            {s.start} - {s.end}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Servicio
                      </label>
                      <select
                        className="w-full border rounded px-2 py-1"
                        value={selectedBooking.serviceType}
                        onChange={(e) =>
                          handleChangeSelected(
                            "serviceType",
                            e.target.value as ServiceType
                          )
                        }
                      >
                        <option value="uñas">Uñas</option>
                        <option value="alaciado">Alaciado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Estado
                      </label>
                      <select
                        className="w-full border rounded px-2 py-1"
                        value={selectedBooking.status}
                        onChange={(e) =>
                          handleChangeSelected(
                            "status",
                            e.target.value as BookingStatus
                          )
                        }
                      >
                        <option value="reservado">Reservado</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Cambiar aquí NO manda WhatsApp. Para enviar WhatsApp usa los
                        botones de abajo.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Nombre del cliente
                    </label>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={selectedBooking.customerName}
                      onChange={(e) =>
                        handleChangeSelected("customerName", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Teléfono del cliente
                    </label>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={selectedBooking.customerPhone}
                      onChange={(e) =>
                        handleChangeSelected("customerPhone", e.target.value)
                      }
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      Recomendado: formato <b>52XXXXXXXXXX</b>
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Notas
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border rounded px-2 py-1"
                      value={selectedBooking.notes || ""}
                      onChange={(e) =>
                        handleChangeSelected("notes", e.target.value)
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveBooking()}
                      disabled={saving}
                      className="rounded bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>

                    {/* ✅ Confirmar + WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus("confirmado", true)}
                      disabled={saving}
                      className="rounded bg-yellow-500 px-3 py-1.5 text-[11px] font-semibold text-slate-900 hover:bg-yellow-600 disabled:opacity-60"
                    >
                      Confirmar + WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetStatus("reservado", false)}
                      disabled={saving}
                      className="rounded bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Marcar como reservado
                    </button>

                    {/* ✅ Cancelar + WhatsApp (si no lo quieres, te lo quito) */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus("cancelado", true)}
                      disabled={saving}
                      className="rounded bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Cancelar + WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PANEL CONFIGURACIÓN HORARIOS */}
            <div className="rounded-xl bg-white p-4 shadow-md">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                Configuración de horarios
              </h2>
              <p className="text-[11px] text-slate-500 mb-2">
                Cambia rápido con “grupos” o ajusta manual. Esto solo afecta ESTE
                panel (luego lo guardamos en DB si quieres).
              </p>

              {/* ✅ Grupos */}
              <div className="mb-3">
                <label className="block text-[11px] font-semibold mb-1">
                  Grupos de horario
                </label>
                <select
                  className="w-full border rounded px-2 py-2 text-xs"
                  value={selectedGroup}
                  onChange={(e) => applyScheduleGroup(e.target.value)}
                >
                  {SCHEDULE_GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                  <option value="custom">Personalizado (manual)</option>
                </select>

                <div className="mt-2 flex flex-wrap gap-2">
                  {SCHEDULE_GROUPS.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => applyScheduleGroup(g.key)}
                      className={`rounded px-3 py-1.5 text-[11px] font-semibold border ${
                        selectedGroup === g.key
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Hora inicio
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className="w-full border rounded px-2 py-1"
                    value={scheduleConfig.openHour}
                    onChange={(e) =>
                      handleChangeScheduleField("openHour", Number(e.target.value || 0))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Hora fin
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    className="w-full border rounded px-2 py-1"
                    value={scheduleConfig.closeHour}
                    onChange={(e) =>
                      handleChangeScheduleField("closeHour", Number(e.target.value || 0))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">
                    Duración (horas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    className="w-full border rounded px-2 py-1"
                    value={scheduleConfig.slotDuration}
                    onChange={(e) =>
                      handleChangeScheduleField("slotDuration", Number(e.target.value || 1))
                    }
                  />
                </div>
              </div>

              <p className="mt-2 text-[10px] text-slate-500">
                Siguiente paso (si quieres): guardamos este horario en DB y lo usamos
                también en la página pública <b>/reservas</b>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
