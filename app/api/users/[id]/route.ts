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

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectDB();

    const raw = req.cookies.get("sessionUser")?.value;
    const session = parseSessionCookie(raw);

    if (!session) {
      return NextResponse.json(
        { message: "No autorizado" },
        { status: 401 }
      );
    }

    // Solo admin puede eliminar usuarios
    if (session.role !== "admin") {
      return NextResponse.json(
        { message: "Solo el administrador puede eliminar usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // No permitir eliminarse a sí mismo
    if (user._id.toString() === session._id) {
      return NextResponse.json(
        { message: "No puedes eliminar tu propio usuario" },
        { status: 400 }
      );
    }

    // Proteger al admin principal
    if (user.username === "admin") {
      return NextResponse.json(
        { message: "No se puede eliminar el administrador principal" },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Usuario eliminado correctamente",
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/users/[id]:", error);
    return NextResponse.json(
      {
        message: "Error al eliminar usuario",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}