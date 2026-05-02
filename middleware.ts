import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  if (url.pathname === "/") {
    if (host === "pos.cosmetictenay.com") {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (host === "tienda.cosmetictenay.com") {
      url.pathname = "/tienda";
      return NextResponse.redirect(url);
    }

    if (host === "citas.cosmetictenay.com") {
      url.pathname = "/reservas";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
