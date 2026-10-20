import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listPendingReports, resolveReport, deleteMessage, getMessage } from "@/lib/chat-db";
import { setBanned, suspendUser, getUserByUsername } from "@/lib/db";
import { logAudit } from "@/lib/audit-db";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json({ reports: listPendingReports() });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { reportId, action, messageId, authorId, targetUsername, reason, suspendMinutes } =
    await req.json();

  if (
    !reportId ||
    !["dismiss", "delete_message", "delete_and_ban", "ban_account", "suspend"].includes(action)
  ) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const message = messageId ? getMessage(messageId) : undefined;
  const banReason = typeof reason === "string" && reason ? `Laporan: ${reason}` : "Dilaporkan pengguna lain.";

  if ((action === "delete_message" || action === "delete_and_ban") && messageId) {
    deleteMessage(messageId);
  }
  if (action === "delete_and_ban" && authorId) {
    setBanned(authorId, true, banReason);
  }
  if (action === "ban_account" && targetUsername) {
    setBanned(targetUsername, true, banReason);
  }
  if (action === "suspend" && targetUsername) {
    const minutes = Math.min(Math.max(Number(suspendMinutes) || 5, 1), 1440);
    const target = getUserByUsername(targetUsername);
    if (target) suspendUser(target.id, minutes * 60 * 1000);
  }

  logAudit({
    action: `report_${action}`,
    targetUsername: message?.username ?? targetUsername,
    detail:
      action === "suspend"
        ? `${Math.min(Math.max(Number(suspendMinutes) || 5, 1), 1440)} menit`
        : message?.text?.slice(0, 60),
  });

  resolveReport(reportId);
  return NextResponse.json({ ok: true });
}
