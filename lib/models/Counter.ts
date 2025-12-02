import mongoose, { Schema, Model, Document } from "mongoose";

export interface ICounter extends Document {
  name: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter: Model<ICounter> =
  mongoose.models.Counter ||
  mongoose.model<ICounter>("Counter", CounterSchema);
