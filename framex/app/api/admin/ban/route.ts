import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { setBanned } from "@/lib/db";
import { logAudit } from "@/lib/audit-db";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { identifier, banned, reason } = await req.json();

  if (!identifier || typeof banned !== "boolean") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const user = setBanned(identifier, banned, typeof reason === "string" ? reason : undefined);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  logAudit({
    action: banned ? "ban" : "unban",
    targetUsername: user.username,
    reason: typeof reason === "string" && reason ? reason : undefined,
  });

  return NextResponse.json({ user });
}
