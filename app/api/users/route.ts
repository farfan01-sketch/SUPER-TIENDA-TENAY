import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, IUserPermissions, UserRole } from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { parseSessionCookie } from "@/lib/auth";

function defaultPermissionsForRole(role: UserRole): IUserPermissions {
  switch (role) {
    case "admin":
      return {
        canSell: true,
        canManageProducts: true,
        canSeeReports: true,
        canDoCashCuts: true,
        canCancelSales: true,
        canManageUsers: true,
        canAccessConfig: true,
      };
    case "supervisor":
      return {
        canSell: true,
        canManageProducts: true,
        canSeeReports: true,
        canDoCashCuts: true,
        canCancelSales: true,
        canManageUsers: false,
        canAccessConfig: false,
      };
    case "encargado":
      return {
        canSell: true,
        canManageProducts: true,
        canSeeReports: true,
        canDoCashCuts: true,
        canCancelSales: false,
        canManageUsers: false,
        canAccessConfig: false,
      };
    case "cajero":
    default:
      return {
        canSell: true,
        canManageProducts: false,
        canSeeReports: false,
        canDoCashCuts: false,
        canCancelSales: false,
        canManageUsers: false,
        canAccessConfig: false,
      };
  }
}

export async function GET(req: NextRequest) {
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

    const users = await User.find()
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = users.map((u: any) => ({
      _id: u._id.toString(),
      username: u.username,
      role: u.role,
      permissions: u.permissions,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    return NextResponse.json(sanitized);
  } catch (error: any) {
    console.error("Error en GET /api/users:", error);
    return NextResponse.json(
      {
        message: "Error al obtener usuarios",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      username,
      password,
      role,
      permissions,
      isActive,
    } = body as {
      username: string;
      password: string;
      role: UserRole;
      permissions?: Partial<IUserPermissions>;
      isActive?: boolean;
    };

    if (!username || !password || !role) {
      return NextResponse.json(
        {
          message:
            "Usuario, contraseña y rol son obligatorios",
        },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return NextResponse.json(
        { message: "Ese usuario ya existe" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const basePermissions = defaultPermissionsForRole(role);
    const mergedPermissions: IUserPermissions = {
      ...basePermissions,
      ...(permissions || {}),
    };

    const user = await User.create({
      username,
      passwordHash,
      role,
      permissions: mergedPermissions,
      isActive: isActive ?? true,
    });

    return NextResponse.json(
      {
        _id: user._id.toString(),
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en POST /api/users:", error);
    return NextResponse.json(
      {
        message: "Error al crear usuario",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
