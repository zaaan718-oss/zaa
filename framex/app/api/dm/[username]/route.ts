import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById, getUserByUsername, isSuspended, suspendUser } from "@/lib/db";
import { listMessages, addMessage, markRead, getPermissionStatus } from "@/lib/dm-db";
import { saveBase64Image, estimateBase64Bytes } from "@/lib/uploads";
import { recordMessageAndCheckSpam } from "@/lib/spam-guard";
import { getTypingUsers } from "@/lib/typing";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SPAM_SUSPEND_MS = 5 * 60 * 1000; // 5 menit

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { username } = await params;
  const other = getUserByUsername(username);
  if (!other) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  const messages = listMessages(session.user.id, other.id);
  markRead(session.user.id, other.id); // buka thread ini = dianggap sudah dibaca

  const otherTyping = getTypingUsers(`dm:${[session.user.id, other.id].sort().join("__")}`, session.user.id);

  // Status izin dari 2 arah: apakah AKU boleh chat ke DIA, dan apakah DIA
  // (kalau dia yang minta) lagi nunggu persetujuan dariku.
  const myPermission = other.requirePermissionForDm
    ? getPermissionStatus(other.id, session.user.id)
    : "approved";
  const incomingRequest = session.user.id
    ? getPermissionStatus(session.user.id, other.id) === "pending"
    : false;

  return NextResponse.json({
    messages,
    other: {
      username: other.username,
      name: other.name,
      avatar: other.avatar,
      requirePermissionForDm: !!other.requirePermissionForDm,
    },
    otherTyping: otherTyping.length > 0,
    myPermission, // "approved" | "none" | "pending" | "declined" - apakah AKU boleh ngirim pesan
    incomingRequest, // true kalau DIA lagi minta izin chat ke AKU, nunggu aku approve/decline
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const me = getUserById(session.user.id);
  if (!me) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  if (me.banned) {
    return NextResponse.json({ error: "Akun kamu sedang dinonaktifkan." }, { status: 403 });
  }
  if (isSuspended(me)) {
    const minutesLeft = Math.ceil((me.suspendedUntil - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Akun kamu ditangguhkan sementara karena terdeteksi spam. Coba lagi dalam ${minutesLeft} menit.` },
      { status: 403 }
    );
  }

  const { username } = await params;
  const other = getUserByUsername(username);
  if (!other) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }
  if (other.id === me.id) {
    return NextResponse.json({ error: "Gak bisa DM diri sendiri." }, { status: 400 });
  }

  if (other.requirePermissionForDm && getPermissionStatus(other.id, me.id) !== "approved") {
    return NextResponse.json(
      { error: `@${other.username} mengaktifkan fitur tunggu izin sebelum chat pribadi. Minta izin dulu sebelum mengirim pesan.` },
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
      imageUrl = await saveBase64Image(image, "dm");
    } catch {
      return NextResponse.json({ error: "Format foto tidak valid." }, { status: 400 });
    }
  }

  const message = addMessage({
    fromUserId: me.id,
    toUserId: other.id,
    text: cleanText,
    imageUrl,
  });

  // Deteksi spam - developer/admin dikecualikan (dicek di dalam isSuspended nanti)
  if (recordMessageAndCheckSpam(me.id) && me.role === "user") {
    suspendUser(me.id, SPAM_SUSPEND_MS);
  }

  return NextResponse.json({ message });
}
