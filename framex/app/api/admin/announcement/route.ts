import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getAnnouncement, setAnnouncement, clearAnnouncement } from "@/lib/announcement-db";
import { logAudit } from "@/lib/audit-db";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  return NextResponse.json({ announcement: getAnnouncement() });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { text } = await req.json();

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Isi pengumuman gak boleh kosong." }, { status: 400 });
  }

  const announcement = setAnnouncement(text.trim());
  logAudit({ action: "broadcast", detail: announcement.text.slice(0, 60) });

  return NextResponse.json({ announcement });
}

export async function DELETE() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  clearAnnouncement();
  logAudit({ action: "broadcast_clear" });

  return NextResponse.json({ ok: true });
}
