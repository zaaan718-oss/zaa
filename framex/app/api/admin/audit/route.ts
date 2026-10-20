import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listAudit } from "@/lib/audit-db";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json({ entries: listAudit(50) });
}
