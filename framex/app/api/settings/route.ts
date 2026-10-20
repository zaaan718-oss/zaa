import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, updateSettings } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  const user = getUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  return NextResponse.json({
    privateAccount: !!user.privateAccount,
    requirePermissionForDm: !!user.requirePermissionForDm,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { privateAccount, requirePermissionForDm } = await req.json();

  const result = updateSettings(session.user.id, {
    privateAccount: typeof privateAccount === "boolean" ? privateAccount : undefined,
    requirePermissionForDm:
      typeof requirePermissionForDm === "boolean" ? requirePermissionForDm : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    privateAccount: !!result.user.privateAccount,
    requirePermissionForDm: !!result.user.requirePermissionForDm,
  });
}
