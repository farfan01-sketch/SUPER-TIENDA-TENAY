import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";

type SessionUser = {
  _id: string;
  username: string;
  role: string;
  permissions: {
    canSell: boolean;
    canManageProducts: boolean;
    canSeeReports: boolean;
    canDoCashCuts: boolean;
    canCancelSales: boolean;
    canManageUsers: boolean;
    canAccessConfig: boolean;
  };
};

function buildSessionCookieValue(user: SessionUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Asegura que exista un admin funcional para pruebas
    const adminPasswordHash = await bcrypt.hash("1234", 10);

    await User.findOneAndUpdate(
      { username: "admin" },
      {
        username: "admin",
        passwordHash: adminPasswordHash,
        role: "admin",
        isActive: true,
        permissions: {
          canSell: true,
          canManageProducts: true,
          canSeeReports: true,
          canDoCashCuts: true,
          canCancelSales: true,
          canManageUsers: true,
          canAccessConfig: true,
        },
      },
      { upsert: true, new: true }
    );

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username }).lean();

    if (!user) {
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "Este usuario está inactivo" },
        { status: 403 }
      );
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);

    if (!passwordOk) {
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const session: SessionUser = {
      _id: user._id.toString(),
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    };

    const cookieValue = buildSessionCookieValue(session);

    const response = NextResponse.json(
      { message: "Login correcto" },
      { status: 200 }
    );

    response.cookies.set("sessionUser", cookieValue, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("ERROR /api/auth/login:", error);
    return NextResponse.json(
      {
        message: "Error interno en el servidor",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}