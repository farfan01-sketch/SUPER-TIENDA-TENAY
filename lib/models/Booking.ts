import mongoose, { Schema, Model, models } from "mongoose";

export type ServiceType = "uñas" | "alaciado";
export type BookingStatus = "reservado" | "cancelado";

export interface IBooking {
  date: string;            // "2025-12-01"
  startTime: string;       // "10:00"
  endTime: string;         // "12:00"
  serviceType: ServiceType;
  customerName: string;
  customerPhone: string;
  notes?: string;
  status: BookingStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    date: { type: String, required: true },        // YYYY-MM-DD
    startTime: { type: String, required: true },   // HH:mm
    endTime: { type: String, required: true },     // HH:mm
    serviceType: {
      type: String,
      enum: ["uñas", "alaciado"],
      required: true,
    },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ["reservado", "cancelado"],
      default: "reservado",
    },
  },
  {
    timestamps: true,
  }
);

// Evitar volver a registrar el modelo en hot reload
const Booking: Model<IBooking> =
  (models.Booking as Model<IBooking>) ||
  mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;
