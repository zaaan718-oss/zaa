import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";

// Dipanggil otomatis kalau heartbeat mendeteksi akun baru kena ban selagi
// user lagi browsing - langsung logout paksa TANPA perlu aksi manual dari
// user. Diarahkan ke /login; begitu mereka coba login lagi, halaman /banned
// otomatis muncul (lihat app/page.tsx).
export async function GET(req: NextRequest) {
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL("/login", req.url));
}
