import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";
import {
  buildSessionCookieValue,
  SessionUser,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username }).lean();
    if (!user || !user.isActive) {
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(
      password,
      user.passwordHash
    );
    if (!valid) {
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      _id: user._id.toString(),
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    };

    const cookieValue = buildSessionCookieValue(sessionUser);

    const res = NextResponse.json({
      message: "Login correcto",
      user: {
        _id: sessionUser._id,
        username: sessionUser.username,
        role: sessionUser.role,
        permissions: sessionUser.permissions,
      },
    });

    res.cookies.set("sessionUser", cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (error: any) {
    console.error("Error en POST /api/login:", error);
    return NextResponse.json(
      {
        message: "Error al iniciar sesión",
        error: error?.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
