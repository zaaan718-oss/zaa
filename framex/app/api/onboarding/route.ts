import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { completeOnboarding } from "@/lib/db";
import { saveBase64Image, estimateBase64Bytes } from "@/lib/uploads";

const MAX_AVATAR_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { username, bio, avatar } = await req.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username wajib diisi." }, { status: 400 });
  }

  let avatarUrl: string | undefined;
  if (avatar && typeof avatar === "string") {
    if (estimateBase64Bytes(avatar) > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: "Ukuran foto maksimal 20MB." }, { status: 400 });
    }
    try {
      avatarUrl = await saveBase64Image(avatar, "avatars");
    } catch {
      return NextResponse.json({ error: "Format foto tidak valid." }, { status: 400 });
    }
  }

  const result = completeOnboarding(session.user.id, {
    username,
    bio: typeof bio === "string" ? bio : undefined,
    avatar: avatarUrl,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ user: result.user });
}
