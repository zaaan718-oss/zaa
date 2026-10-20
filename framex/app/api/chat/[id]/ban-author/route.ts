import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, isModerator, setBanned } from "@/lib/db";
import { getMessage, deleteMessage } from "@/lib/chat-db";
import { logAudit } from "@/lib/audit-db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const dbUser = getUserById(session.user.id);
  if (!dbUser || !isModerator(dbUser)) {
    return NextResponse.json({ error: "Kamu gak punya izin melakukan ini." }, { status: 403 });
  }

  const { id } = await params;
  const message = getMessage(id);
  if (!message) {
    return NextResponse.json({ error: "Pesan tidak ditemukan." }, { status: 404 });
  }

  // Sesama developer/admin gak bisa saling ban lewat chat - cuma pemilik
  // akun Pterodactyl lewat /admin yang bisa override ini.
  const author = getUserById(message.authorId);
  if (author && author.role !== "user") {
    return NextResponse.json({ error: "Gak bisa mem-ban sesama developer/admin." }, { status: 403 });
  }

  setBanned(message.authorId, true, `Di-ban oleh moderator @${dbUser.username} lewat chat.`);
  deleteMessage(id);

  logAudit({
    action: "ban",
    targetUsername: message.username,
    detail: `via chat oleh @${dbUser.username}`,
  });

  return NextResponse.json({ ok: true });
}
