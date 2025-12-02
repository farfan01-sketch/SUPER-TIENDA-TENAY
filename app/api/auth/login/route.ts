import { NextResponse } from "next/server";

// Tipo mínimo de usuario de sesión (sin depender de lib/)
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

// Construye el valor de la cookie como hacías en lib/auth.ts
function buildSessionCookieValue(user: SessionUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    console.log("BODY LOGIN:", { username, password });

    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    // Usuario de prueba
    const ADMIN_USER = "admin";
    const ADMIN_PASS = "1234";

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return NextResponse.json(
        { message: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const session: SessionUser = {
      _id: "demo-admin-id",
      username: ADMIN_USER,
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
    };

    const cookieValue = buildSessionCookieValue(session);

    const response = NextResponse.json(
      { message: "Login correcto" },
      { status: 200 }
    );

    // Nombre de cookie que ya usa tu POS
    response.cookies.set("sessionUser", cookieValue, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8, // 8 horas
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("ERROR /api/auth/login:", error);
    return NextResponse.json(
      { message: "Error interno en el servidor" },
      { status: 500 }
    );
  }
}
