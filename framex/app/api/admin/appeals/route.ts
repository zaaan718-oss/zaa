import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listPendingAppeals, resolveAppeal } from "@/lib/db";
import { logAudit } from "@/lib/audit-db";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const appeals = listPendingAppeals().map((u) => ({
    id: u.id,
    username: u.username,
    banReason: u.banReason,
    appealText: u.appealText,
    appealSubmittedAt: u.appealSubmittedAt,
  }));

  return NextResponse.json({ appeals });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { identifier, approve } = await req.json();
  if (!identifier || typeof approve !== "boolean") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const user = resolveAppeal(identifier, approve);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  logAudit({
    action: approve ? "appeal_approved" : "appeal_rejected",
    targetUsername: user.username,
  });

  return NextResponse.json({ user });
}
