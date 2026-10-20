import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByUsername } from "@/lib/db";
import { requestPermission, resolvePermission } from "@/lib/dm-db";

// Dipanggil oleh REQUESTER (yang mau chat) - "username" di URL adalah
// pemilik fitur "tunggu izin sebelum chat pribadi" yang mau diajak ngobrol.
export async function POST(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { username } = await params;
  const owner = getUserByUsername(username);
  if (!owner) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }
  if (owner.id === session.user.id) {
    return NextResponse.json({ error: "Gak bisa minta izin ke diri sendiri." }, { status: 400 });
  }
  if (!owner.requirePermissionForDm) {
    return NextResponse.json({ error: "User ini gak mengaktifkan fitur tunggu izin." }, { status: 400 });
  }

  const result = requestPermission(owner.id, session.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ status: result.status });
}

// Dipanggil oleh OWNER (pemilik fitur) buat approve/decline permintaan -
// "username" di URL adalah requester yang ngajuin izin.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { username } = await params;
  const requester = getUserByUsername(username);
  if (!requester) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  const { action } = await req.json();
  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
  }

  const result = resolvePermission(session.user.id, requester.id, action === "approve");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ status: result.status });
}
