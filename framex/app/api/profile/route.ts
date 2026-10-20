import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, updateProfile } from "@/lib/db";
import { saveBase64Image, estimateBase64Bytes } from "@/lib/uploads";

const MAX_AVATAR_BYTES = 20 * 1024 * 1024; // 20MB

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  const user = getUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { username, bio, avatar } = await req.json();

  let avatarUrl: string | undefined;
  if (avatar && typeof avatar === "string" && avatar.startsWith("data:")) {
    if (estimateBase64Bytes(avatar) > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: "Ukuran foto maksimal 20MB." }, { status: 400 });
    }
    try {
      avatarUrl = await saveBase64Image(avatar, "avatars");
    } catch (err) {
      console.error("Gagal simpan avatar:", err);
      return NextResponse.json({ error: "Gagal menyimpan foto. Coba format lain (JPG/PNG)." }, { status: 400 });
    }
  }

  const result = updateProfile(session.user.id, { username, bio, avatar: avatarUrl });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ user: result.user });
}
