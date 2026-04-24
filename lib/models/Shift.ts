import mongoose, { Schema, models, model } from "mongoose";

export type ShiftStatus = "open" | "closed";

export type IShift = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  initialCash: number;
  finalCash?: number;
  openedAt: Date;
  closedAt?: Date | null;
  status: ShiftStatus;
};

const ShiftSchema = new Schema<IShift>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    initialCash: {
      type: Number,
      required: true,
      default: 0,
    },
    finalCash: {
      type: Number,
      default: 0,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Shift =
  models.Shift || model<IShift>("Shift", ShiftSchema);