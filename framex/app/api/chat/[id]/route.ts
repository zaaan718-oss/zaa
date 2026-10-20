import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, isModerator } from "@/lib/db";
import { getMessage, deleteMessage } from "@/lib/chat-db";
import { logAudit } from "@/lib/audit-db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const dbUser = getUserById(session.user.id);
  if (!dbUser) {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }

  const { id } = await params;
  const message = getMessage(id);
  if (!message || message.deleted) {
    return NextResponse.json({ error: "Pesan tidak ditemukan." }, { status: 404 });
  }

  const isOwner = message.authorId === dbUser.id;

  if (!isOwner) {
    if (!isModerator(dbUser)) {
      return NextResponse.json({ error: "Kamu gak punya izin menghapus pesan ini." }, { status: 403 });
    }
    // Staff (developer/admin) gak bisa dihapus komennya oleh staff lain lewat
    // chat - cuma pemilik akun Pterodactyl lewat /admin yang bisa override ini.
    const author = getUserById(message.authorId);
    if (author && author.role !== "user") {
      return NextResponse.json(
        { error: "Gak bisa menghapus pesan sesama developer/admin." },
        { status: 403 }
      );
    }

    logAudit({
      action: "chat_delete_by_moderator",
      targetUsername: message.username,
      detail: `oleh @${dbUser.username}: "${message.text.slice(0, 60)}"`,
    });
  }

  deleteMessage(id);
  return NextResponse.json({ ok: true });
}
