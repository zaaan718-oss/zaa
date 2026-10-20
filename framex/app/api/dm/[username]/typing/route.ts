import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, getUserByUsername } from "@/lib/db";
import { pingTyping, getTypingUsers } from "@/lib/typing";

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const me = getUserById(session.user.id);
  if (!me) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const { username } = await params;
  const other = getUserByUsername(username);
  if (!other) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const scope = `dm:${[me.id, other.id].sort().join("__")}`;
  pingTyping(scope, me.id, me.username);

  return NextResponse.json({ ok: true });
}

// Endpoint terpisah buat CEK status typing - di-poll lebih sering & independen
// dari polling daftar pesan, biar animasinya responsif.
export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const me = getUserById(session.user.id);
  if (!me) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const { username } = await params;
  const other = getUserByUsername(username);
  if (!other) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const scope = `dm:${[me.id, other.id].sort().join("__")}`;
  const typingUsers = getTypingUsers(scope, me.id);

  return NextResponse.json({ typing: typingUsers.length > 0 });
}
