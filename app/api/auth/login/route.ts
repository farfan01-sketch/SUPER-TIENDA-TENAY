import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import {
  buildSessionCookieValue,
  SessionUser,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son obligatorios" },
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

    const passwordOk = await bcrypt.compare(password, user.passwordHash);

    if (!passwordOk) {
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

    const response = NextResponse.json(
      {
        message: "Login correcto",
        user: {
          _id: sessionUser._id,
          username: sessionUser.username,
          role: sessionUser.role,
          permissions: sessionUser.permissions,
        },
      },
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