import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

// Instance auth() KHUSUS untuk middleware (edge runtime) - dibangun dari
// authConfig murni, TANPA callback yang menyentuh better-sqlite3. Kalau
// pakai `@/auth` yang penuh (ada db.ts di jwt/session callback), middleware
// akan crash karena native module gak jalan di Edge runtime.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/admin") || // halaman admin pakai auth terpisah, bukan Google
    pathname.startsWith("/api/admin");

  if (isPublic) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Middleware jalan di semua route KECUALI file statis Next.js
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
