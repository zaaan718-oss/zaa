import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listConversationsForUser, countUnread } from "@/lib/dm-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const conversations = listConversationsForUser(session.user.id);
  const total = conversations.reduce((sum, c) => sum + countUnread(c, session.user.id), 0);

  return NextResponse.json({ total });
}
