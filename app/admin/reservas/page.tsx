"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ServiceType = "uñas" | "alaciado";

type BookingStatus = "reservado" | "cancelado";

type Booking = {
  _id: string;
  date: string; // "2025-12-01"
  startTime: string; // "10:00"
  endTime: string; // "12:00"
  serviceType: ServiceType;
  customerName: string;
  customerPhone: string;
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
    const end = `${(h + config.slotDuration)
      .toString()
      .padStart(2, "0")}:00`;
    slots.push({ start, end });
  }
  return slots;
}

const DEFAULT_CONFIG: ScheduleConfig = {
  openHour: 10, // 10:00
  closeHour: 20, // 20:00
  slotDuration: 2, // 2 horas
};

export default function AdminReservasPage() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState<string>(todayStr);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // configuración de horarios (grupos de horario)
  const [scheduleConfig, setScheduleConfig] =
    useState<ScheduleConfig>(DEFAULT_CONFIG);

  const slots = useMemo(
    () => generateSlots(scheduleConfig),
    [scheduleConfig]
  );

  // cita seleccionada para editar
  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function loadBookings(selectedDate: string) {
    try {
      clearMessages();
      setLoading(true);

      const res = await fetch(
        `/api/bookings?date=${selectedDate}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message || "Error al cargar reservas"
        );
      }
      const data: Booking[] = await res.json();
      setBookings(data);

      // si la reserva seleccionada ya no existe para ese día, la limpiamos
      if (
        selectedBooking &&
        !data.find((b) => b._id === selectedBooking._id)
      ) {
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

  function getBookingsForSlot(start: string): Booking[] {
    return bookings.filter(
      (b) =>
        b.startTime === start &&
        b.status === "reservado"
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

  async function handleSaveBooking() {
    if (!selectedBooking) return;
    clearMessages();

    try {
      setSaving(true);
      const res = await fetch(
        `/api/bookings/${selectedBooking._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
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
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message || "Error al guardar cambios"
        );
      }

      setSuccess("Cambios guardados correctamente.");
      await loadBookings(date);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || "Error al guardar la reserva"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSetStatus(status: BookingStatus) {
    if (!selectedBooking) return;
    handleChangeSelected("status", status);
    await handleSaveBooking();
  }

  function handleChangeScheduleField(
    field: keyof ScheduleConfig,
    value: number
  ) {
    setScheduleConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
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
              Confirma, ajusta horarios o cancela citas de
              uñas y alaciados.
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
            <label className="text-sm font-semibold">
              Fecha:
            </label>
            <input
              type="date"
              className="border rounded px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1 text-xs">
            {loading && (
              <span className="text-slate-500">
                Cargando reservas...
              </span>
            )}
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
            <h2 className="text-sm font-semibold text-slate-800 mb-1">
              Horarios del día
            </h2>

            <div className="grid md:grid-cols-3 gap-3">
              {slots.map((slot) => {
                const slotBookings = getBookingsForSlot(
                  slot.start
                );
                const hasBookings =
                  slotBookings.length > 0;

                const isSelected =
                  !!selectedBooking &&
                  selectedBooking.startTime === slot.start;

                return (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => {
                      if (hasBookings) {
                        // selecciona la primera reserva del slot
                        handleSelectBooking(
                          slotBookings[0]
                        );
                      } else {
                        setSelectedBooking(null);
                      }
                    }}
                    className={`border rounded p-3 text-left text-xs transition ${
                      hasBookings
                        ? "bg-red-50 border-red-300"
                        : "bg-green-50 border-emerald-300"
                    } ${
                      isSelected
                        ? "ring-2 ring-blue-400"
                        : ""
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
                            className="border border-red-200 rounded px-2 py-1 bg-white"
                          >
                            <div className="font-semibold">
                              {b.customerName}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {b.serviceType} · Tel:{" "}
                              {b.customerPhone}
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
                      <div className="text-[11px] text-emerald-700">
                        Libre
                      </div>
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
                  Selecciona una cita en los horarios de la
                  izquierda para editarla.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Fecha
                      </label>
                      <input
                        type="date"
                        className="w-full border rounded px-2 py-1"
                        value={selectedBooking.date.slice(
                          0,
                          10
                        )}
                        onChange={(e) =>
                          handleChangeSelected(
                            "date",
                            e.target.value
                          )
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
                          const slot = slots.find(
                            (s) => s.start === newStart
                          );
                          if (!slot) return;
                          handleChangeSelected(
                            "startTime",
                            slot.start
                          );
                          handleChangeSelected(
                            "endTime",
                            slot.end
                          );
                        }}
                      >
                        {slots.map((s) => (
                          <option
                            key={s.start}
                            value={s.start}
                          >
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
                        <option value="alaciado">
                          Alaciado
                        </option>
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
                        <option value="reservado">
                          Reservado
                        </option>
                        <option value="cancelado">
                          Cancelado
                        </option>
                      </select>
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
                        handleChangeSelected(
                          "customerName",
                          e.target.value
                        )
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
                        handleChangeSelected(
                          "customerPhone",
                          e.target.value
                        )
                      }
                    />
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
                        handleChangeSelected(
                          "notes",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveBooking}
                      disabled={saving}
                      className="rounded bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {saving
                        ? "Guardando..."
                        : "Guardar cambios"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSetStatus("reservado")
                      }
                      className="rounded bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      Marcar como reservado
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSetStatus("cancelado")
                      }
                      className="rounded bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700"
                    >
                      Cancelar cita
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
                Ajusta el rango de atención y la duración de
                cada bloque de horario. Esto afecta cómo se
                muestran los horarios en este panel.
              </p>

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
                      handleChangeScheduleField(
                        "openHour",
                        Number(e.target.value || 0)
                      )
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
                      handleChangeScheduleField(
                        "closeHour",
                        Number(e.target.value || 0)
                      )
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
                      handleChangeScheduleField(
                        "slotDuration",
                        Number(e.target.value || 1)
                      )
                    }
                  />
                </div>
              </div>

              <p className="mt-2 text-[10px] text-slate-500">
                Si quieres que esta configuración también se
                use en la página pública de reservas para tus
                clientes, luego podemos guardar estos valores
                en base de datos y reutilizarlos allá.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
