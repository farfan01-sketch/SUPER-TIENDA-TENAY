import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionCookie } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas
  const publicPaths = [
    "/login",
    "/api/login",
    "/api/auth/logout",
    "/api/setup/create-admin",
    "/",
    "/favicon.ico",
    "/_next",
    "/api/products", // si quieres bloquear también apis, se quita esto
  ];

  if (
    publicPaths.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
  ) {
    return NextResponse.next();
  }

  const raw = request.cookies.get("sessionUser")?.value;
  const session = parseSessionCookie(raw);

  // Si no hay sesión y la ruta es protegida, mandar a login
  const isProtectedPage =
    pathname.startsWith("/pos") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/ticket");

  if (isProtectedPage && !session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!session) {
    return NextResponse.next();
  }

  const perms = session.permissions || {};

  // Reglas de permisos
  if (pathname.startsWith("/pos")) {
    if (!perms.canSell) {
      return NextResponse.redirect(
        new URL("/login?denied=1", request.url)
      );
    }
  }

  if (pathname.startsWith("/admin/products")) {
    if (!perms.canManageProducts) {
      return NextResponse.redirect(
        new URL("/login?denied=1", request.url)
      );
    }
  }

  // 🔐 Inventario → mismo permiso que productos
  if (pathname.startsWith("/admin/inventory")) {
    if (!perms.canManageProducts) {
      return NextResponse.redirect(
        new URL("/login?denied=1", request.url)
      );
    }
  }

  if (
    pathname.startsWith("/admin/reports") ||
    pathname.startsWith("/admin/dashboard")
  ) {
    if (!perms.canSeeReports) {
      return NextResponse.redirect(
        new URL("/login?denied=1", request.url)
      );
    }
  }

  if (pathname.startsWith("/admin/corte")) {
    if (!perms.canDoCashCuts) {
      return NextResponse.redirect(
        new URL("/login?denied=1", request.url)
      );
    }
  }

  if (pathname.startsWith("/admin/sales")) {
    if (!perms.canCancelSales && !perms.canSeeReports) {
      return NextResponse.redirect(
        new URL("/login?denied=1", request.url)
      );
    }
  }

  if (pathname.startsWith("/admin/users")) {
    if (!perms.canManageUsers) {
      return NextResponse.redirect(
        new URL("/login?denied=1", request.url)
      );
    }
  }

  if (pathname.startsWith("/admin/config")) {
    if (!perms.canAccessConfig) {
      return NextResponse.redirect(
        new URL("/login?denied=1", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*", "/admin/:path*", "/ticket/:path*"],
};
