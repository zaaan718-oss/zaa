import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, isSuspended, suspendUser } from "@/lib/db";
import { listMessages, addMessage } from "@/lib/chat-db";
import { saveBase64Image, estimateBase64Bytes } from "@/lib/uploads";
import { recordMessageAndCheckSpam } from "@/lib/spam-guard";
import { getTypingUsers } from "@/lib/typing";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB buat foto di chat
const SPAM_SUSPEND_MS = 5 * 60 * 1000; // 5 menit

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  const typing = getTypingUsers("global", session.user.id);
  return NextResponse.json({ messages: listMessages(100), typing });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const dbUser = getUserById(session.user.id);
  if (!dbUser) {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }
  if (dbUser.banned) {
    return NextResponse.json({ error: "Akun kamu sedang dinonaktifkan." }, { status: 403 });
  }
  if (isSuspended(dbUser)) {
    const minutesLeft = Math.ceil((dbUser.suspendedUntil - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Akun kamu ditangguhkan sementara karena terdeteksi spam. Coba lagi dalam ${minutesLeft} menit.` },
      { status: 403 }
    );
  }

  const { text, image } = await req.json();

  const cleanText = typeof text === "string" ? text.trim() : "";
  if (!cleanText && !image) {
    return NextResponse.json({ error: "Pesan gak boleh kosong." }, { status: 400 });
  }
  if (cleanText.length > 500) {
    return NextResponse.json({ error: "Pesan maksimal 500 karakter." }, { status: 400 });
  }

  let imageUrl: string | undefined;
  if (image && typeof image === "string") {
    if (estimateBase64Bytes(image) > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Ukuran foto maksimal 10MB." }, { status: 400 });
    }
    try {
      imageUrl = await saveBase64Image(image, "chat");
    } catch {
      return NextResponse.json({ error: "Format foto tidak valid." }, { status: 400 });
    }
  }

  const message = addMessage({
    authorId: dbUser.id,
    username: dbUser.username,
    avatar: dbUser.avatar,
    role: dbUser.role,
    plan: dbUser.plan,
    text: cleanText,
    imageUrl,
  });

  // Deteksi spam - developer/admin dikecualikan lewat isSuspended
  if (recordMessageAndCheckSpam(dbUser.id) && dbUser.role === "user") {
    suspendUser(dbUser.id, SPAM_SUSPEND_MS);
  }

  return NextResponse.json({ message });
}
