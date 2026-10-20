import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/db";
import { listConversationsForUser, otherUserId, countUnread } from "@/lib/dm-db";
import type { PermissionStatus } from "@/lib/dm-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const conversations = listConversationsForUser(session.user.id);

  const enriched = conversations.map((c) => {
    const otherId = otherUserId(c, session.user.id);
    const other = getUserById(otherId);
    const activeMessages = c.messages.filter((m) => !m.deleted);
    const lastMessage = activeMessages[activeMessages.length - 1];
    const incomingRequest: PermissionStatus = c.permissions?.[session.user.id] ?? "none";
    return {
      username: other?.username ?? "pengguna",
      name: other?.name ?? "Pengguna",
      avatar: other?.avatar ?? "",
      lastMessage: lastMessage?.text || (lastMessage?.imageUrl ? "📷 Foto" : ""),
      lastAt: lastMessage?.createdAt ?? c.messages[0]?.createdAt ?? 0,
      unread: countUnread(c, session.user.id),
      // "pending" cuma berarti sesuatu kalau percakapan ini emang lagi nunggu
      // persetujuanku (dari sisi aku sebagai pemilik fitur tunggu izin).
      pendingRequest: incomingRequest === "pending",
    };
  });

  return NextResponse.json({ conversations: enriched });
}
