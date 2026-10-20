import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, getUserByUsername } from "@/lib/db";
import { reportAccount } from "@/lib/chat-db";
import { listMessages as listDmMessages } from "@/lib/dm-db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const me = getUserById(session.user.id);
  if (!me) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const { username } = await params;
  const target = getUserByUsername(username);
  if (!target) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  if (target.id === me.id) {
    return NextResponse.json({ error: "Gak bisa lapor akun sendiri." }, { status: 400 });
  }

  const { reason, category } = await req.json();
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "Alasan laporan wajib diisi." }, { status: 400 });
  }

  const cleanCategory = category === "spam" ? "spam" : "other";

  // Khusus laporan spam: ambil snapshot 5 pesan terakhir dari yang dilaporkan
  // di percakapan DM ini, biar admin bisa langsung lihat buktinya tanpa
  // perlu buka DM orang lain.
  let contextMessages: string[] | undefined;
  if (cleanCategory === "spam") {
    const dmHistory = listDmMessages(me.id, target.id);
    contextMessages = dmHistory
      .filter((m) => m.senderId === target.id)
      .slice(-5)
      .map((m) => m.text || (m.imageUrl ? "[foto]" : ""));
  }

  const result = reportAccount({
    targetUsername: target.username,
    reporterId: me.id,
    reporterUsername: me.username,
    reason: reason.trim(),
    category: cleanCategory,
    contextMessages,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
