import mongoose, { Schema, Model, Document } from "mongoose";

export type UserRole = "admin" | "supervisor" | "encargado" | "cajero";

export interface IUserPermissions {
  canSell: boolean;
  canManageProducts: boolean;
  canSeeReports: boolean;
  canDoCashCuts: boolean;
  canCancelSales: boolean;
  canManageUsers: boolean;
  canAccessConfig: boolean;
}

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: UserRole;
  permissions: IUserPermissions;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionsSchema = new Schema<IUserPermissions>(
  {
    canSell: { type: Boolean, default: true },
    canManageProducts: { type: Boolean, default: false },
    canSeeReports: { type: Boolean, default: false },
    canDoCashCuts: { type: Boolean, default: false },
    canCancelSales: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canAccessConfig: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "supervisor", "encargado", "cajero"],
      default: "cajero",
    },
    permissions: {
      type: PermissionsSchema,
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
