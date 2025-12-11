"use client";

import { useEffect, useState } from "react";

type ServiceType = "uñas" | "alaciado";

type Booking = {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: ServiceType;
  customerName: string;
  customerPhone: string;
  notes?: string;
  status: "reservado" | "cancelado";
};

const OPEN_HOUR = 10; // 10:00
const CLOSE_HOUR = 20; // 20:00 (8 pm)
const SLOT_DURATION = 2; // 2 horas

function generateSlots() {
  const slots: { start: string; end: string }[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h += SLOT_DURATION) {
    const start = `${h.toString().padStart(2, "0")}:00`;
    const end = `${(h + SLOT_DURATION).toString().padStart(2, "0")}:00`;
    slots.push({ start, end });
  }
  return slots;
}

const SLOTS = generateSlots();

export default function ReservasPublicPage() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState<string>(todayStr);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>("uñas");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  async function loadBookings(selectedDate: string) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/bookings?date=${selectedDate}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Error al cargar citas");
      }
      const data = await res.json();
      setBookings(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings(date);
  }, [date]);

  async function handleCreateBooking() {
    if (!selectedSlot) {
      alert("Selecciona un horario primero");
      return;
    }
    if (!customerName || !customerPhone) {
      alert("Nombre y teléfono del cliente son obligatorios");
      return;
    }

    const slot = SLOTS.find((s) => s.start === selectedSlot);
    if (!slot) return;

    try {
      setCreating(true);
      setError(null);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          startTime: slot.start,
          endTime: slot.end,
          serviceType,
          customerName,
          customerPhone,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Error al crear la cita");
      }

      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setSelectedSlot(null);

      await loadBookings(date);
      alert("Cita creada correctamente ✅");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error desconocido");
      alert(err.message || "Error al crear cita");
    } finally {
      setCreating(false);
    }
  }

  function getBookingForSlot(start: string) {
    return bookings.find(
      (b) => b.startTime === start && b.status === "reservado"
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        Reservas de Citas – Uñas y Alaciados
      </h1>
      <p className="text-sm text-gray-600 mb-2">
        Elige la fecha, revisa los horarios libres y aparta tu cita. Nos
        comunicaremos por WhatsApp para confirmar.
      </p>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div>
          <label className="block text-sm font-semibold mb-1">Fecha</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {loading && (
          <span className="text-sm text-gray-500">Cargando citas...</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {/* Horarios */}
      <div className="grid md:grid-cols-3 gap-3">
        {SLOTS.map((slot) => {
          const booking = getBookingForSlot(slot.start);
          const isSelected = selectedSlot === slot.start;
          const isBusy = Boolean(booking);

          return (
            <button
              key={slot.start}
              type="button"
              onClick={() => !isBusy && setSelectedSlot(slot.start)}
              className={`border rounded p-3 text-left transition
                ${
                  isBusy
                    ? "bg-red-100 border-red-400 cursor-not-allowed"
                    : "hover:border-blue-400"
                }
                ${
                  !isBusy && isSelected
                    ? "bg-blue-100 border-blue-500"
                    : ""
                }
              `}
            >
              <div className="font-semibold">
                {slot.start} - {slot.end}
              </div>
              {isBusy ? (
                <div className="mt-1 text-sm">
                  <span className="font-semibold">Ocupado</span>
                </div>
              ) : (
                <div className="mt-1 text-sm text-green-700">Libre</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Formulario crear cita */}
      <div className="mt-6 border rounded p-4 max-w-xl">
        <h2 className="font-semibold mb-3">Apartar cita</h2>

        <div className="mb-2">
          <label className="block text-sm font-semibold mb-1">
            Horario seleccionado
          </label>
          <div className="px-3 py-2 border rounded bg-gray-50">
            {selectedSlot
              ? `${selectedSlot} - ${
                  SLOTS.find((s) => s.start === selectedSlot)?.end || ""
                }`
              : "Selecciona un horario libre en la parte de arriba"}
          </div>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-semibold mb-1">
            Servicio
          </label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={serviceType}
            onChange={(e) =>
              setServiceType(e.target.value as ServiceType)
            }
          >
            <option value="uñas">Uñas</option>
            <option value="alaciado">Alaciado</option>
          </select>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-semibold mb-1">
            Nombre
          </label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="mb-2">
          <label className="block text-sm font-semibold mb-1">
            Teléfono (WhatsApp)
          </label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-semibold mb-1">
            Notas (opcional)
          </label>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={handleCreateBooking}
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {creating ? "Guardando..." : "Apartar cita"}
        </button>
      </div>
    </div>
  );
}
