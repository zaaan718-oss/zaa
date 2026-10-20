import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { countUsers, countOnline, getUsageTotals } from "@/lib/db";
import { getChatStats } from "@/lib/chat-db";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const usage = getUsageTotals();
  const chat = getChatStats();

  return NextResponse.json({
    totalUsers: countUsers(),
    onlineUsers: countOnline(5),
    totalFpsUsage: usage.totalFpsUsage,
    totalUpscaleUsage: usage.totalUpscaleUsage,
    totalTiktokUsage: usage.totalTiktokUsage,
    totalChatMessages: chat.totalMessages,
    chatMessagesToday: chat.messagesToday,
    pendingReports: chat.pendingReports,
  });
}
