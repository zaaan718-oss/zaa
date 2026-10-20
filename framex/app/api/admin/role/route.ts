import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { setRole, Role } from "@/lib/db";
import { logAudit } from "@/lib/audit-db";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { identifier, role } = await req.json();

  if (!identifier || !["user", "developer", "admin"].includes(role)) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const user = setRole(identifier, role as Role);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  logAudit({ action: "set_role", targetUsername: user.username, detail: role });

  return NextResponse.json({ user });
}
