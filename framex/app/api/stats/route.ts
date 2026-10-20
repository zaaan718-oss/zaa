import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { countUsers, countOnline } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  return NextResponse.json({
    totalUsers: countUsers(),
    onlineUsers: countOnline(5),
  });
}
