import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByUsername } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { username } = await params;
  const user = getUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  // Cuma field publik - jangan pernah expose email/googleId ke user lain
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      plan: user.plan,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
}
