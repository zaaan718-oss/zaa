import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/db";
import { pingTyping, getTypingUsers } from "@/lib/typing";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const dbUser = getUserById(session.user.id);
  if (!dbUser) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  pingTyping("global", dbUser.id, dbUser.username);
  return NextResponse.json({ ok: true });
}

// Dipoll terpisah & lebih sering dari daftar pesan, biar animasi typing-nya responsif.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const dbUser = getUserById(session.user.id);
  if (!dbUser) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const typingUsernames = getTypingUsers("global", dbUser.id);
  return NextResponse.json({ typingUsernames });
}
