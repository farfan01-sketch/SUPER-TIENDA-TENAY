import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();

    const count = await User.countDocuments();
    if (count > 0) {
      return NextResponse.json(
        {
          message:
            "Ya existen usuarios. Esta ruta solo es para la primera vez.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash("admin123", 10);

    const user = await User.create({
      username: "admin",
      passwordHash,
      role: "admin",
      permissions: {
        canSell: true,
        canManageProducts: true,
        canSeeReports: true,
        canDoCashCuts: true,
        canCancelSales: true,
        canManageUsers: true,
        canAccessConfig: true,
      },
      isActive: true,
    });

    return NextResponse.json(
      {
        message:
          "Usuario admin creado. Usuario: admin, Contraseña: admin123. Cámbiala después.",
        user: {
          _id: user._id,
          username: user.username,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en create-admin:", error);
    return NextResponse.json(
      {
        message: "Error al crear admin",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
