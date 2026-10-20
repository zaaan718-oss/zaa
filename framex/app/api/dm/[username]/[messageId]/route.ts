import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByUsername } from "@/lib/db";
import { editMessage, deleteMessage } from "@/lib/dm-db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { username, messageId } = await params;
  const other = getUserByUsername(username);
  if (!other) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const { text } = await req.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Pesan gak boleh kosong." }, { status: 400 });
  }

  const result = editMessage(session.user.id, other.id, messageId, session.user.id, text.trim());
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ message: result.message });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { username, messageId } = await params;
  const other = getUserByUsername(username);
  if (!other) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const result = deleteMessage(session.user.id, other.id, messageId, session.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
