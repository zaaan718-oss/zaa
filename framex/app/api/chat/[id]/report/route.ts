import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/db";
import { reportMessage } from "@/lib/chat-db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const dbUser = getUserById(session.user.id);
  if (!dbUser) {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }

  const { id } = await params;
  const { reason } = await req.json().catch(() => ({ reason: "" }));

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "Alasan laporan wajib diisi." }, { status: 400 });
  }

  const result = reportMessage({
    messageId: id,
    reporterId: dbUser.id,
    reporterUsername: dbUser.username,
    reason: reason.trim(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
