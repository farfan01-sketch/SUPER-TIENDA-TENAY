import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  User,
  IUserPermissions,
  UserRole,
} from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { parseSessionCookie } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);
    if (!session || !session.permissions.canManageUsers) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const {
      role,
      permissions,
      isActive,
      password,
    } = body as {
      role?: UserRole;
      permissions?: Partial<IUserPermissions>;
      isActive?: boolean;
      password?: string;
    };

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Evitar que te desactives a ti mismo
    if (user._id.toString() === session._id) {
      if (isActive === false) {
        return NextResponse.json(
          {
            message:
              "No puedes desactivar tu propio usuario",
          },
          { status: 400 }
        );
      }
    }

    if (role) user.role = role;
    if (typeof isActive === "boolean") {
      user.isActive = isActive;
    }

    if (permissions) {
      user.permissions = {
        ...user.permissions,
        ...permissions,
      };
    }

    if (password && password.trim().length > 0) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    return NextResponse.json({
      _id: user._id.toString(),
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    });
  } catch (error: any) {
    console.error("Error en PUT /api/users/[id]:", error);
    return NextResponse.json(
      {
        message: "Error al actualizar usuario",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
