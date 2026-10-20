import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { setPlan, Plan } from "@/lib/db";
import { logAudit } from "@/lib/audit-db";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { identifier, plan } = await req.json();

  if (!identifier || !["free", "pro", "max"].includes(plan)) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const user = setPlan(identifier, plan as Plan);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  logAudit({ action: "set_plan", targetUsername: user.username, detail: plan });

  return NextResponse.json({ user });
}
