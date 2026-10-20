import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByUsername } from "@/lib/db";
import { getPermissionStatus } from "@/lib/dm-db";
import { startCall, getCall, acceptCall, declineCall, endCall, addCandidate } from "@/lib/call-db";

// Bungkus sesi call jadi bentuk yang aman dikirim ke client: cuma kasih
// kandidat ICE milik LAWAN bicara (yang perlu ditambahin ke peer connection
// sendiri), bukan punya diri sendiri.
function serialize(session: ReturnType<typeof getCall>, me: string) {
  if (!session) return null;
  return {
    status: session.status,
    isCaller: session.callerId === me,
    offer: session.offer,
    answer: session.answer,
    candidates: session.candidates.filter((c) => c.from !== me).map((c) => c.candidate),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  const { username } = await params;
  const other = getUserByUsername(username);
  if (!other) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const call = getCall(session.user.id, other.id);
  return NextResponse.json({ call: serialize(call, session.user.id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const me = await auth();
  if (!me?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  const { username } = await params;
  const other = getUserByUsername(username);
  if (!other) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  if (other.id === me.user.id) {
    return NextResponse.json({ error: "Gak bisa nelpon diri sendiri." }, { status: 400 });
  }

  // Konsisten sama aturan chat pribadi: kalau penerima mengaktifkan fitur
  // tunggu izin dan belum menyetujui kita, panggilan juga diblokir.
  if (other.requirePermissionForDm && getPermissionStatus(other.id, me.user.id) !== "approved") {
    return NextResponse.json(
      { error: `@${other.username} mengaktifkan fitur tunggu izin sebelum chat pribadi.` },
      { status: 403 }
    );
  }

  const { offer } = await req.json();
  if (!offer) {
    return NextResponse.json({ error: "Offer SDP wajib ada." }, { status: 400 });
  }

  const result = startCall(me.user.id, other.id, offer);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ call: serialize(result.session, me.user.id) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const me = await auth();
  if (!me?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  const { username } = await params;
  const other = getUserByUsername(username);
  if (!other) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const body = await req.json();

  if (body.action === "accept") {
    if (!body.answer) return NextResponse.json({ error: "Answer SDP wajib ada." }, { status: 400 });
    // "username" di URL di sini adalah si PENELPON (caller), yang nerima = aku.
    const updated = acceptCall(other.id, me.user.id, body.answer);
    if (!updated) return NextResponse.json({ error: "Gak ada panggilan masuk dari user ini." }, { status: 400 });
    return NextResponse.json({ call: serialize(updated, me.user.id) });
  }

  if (body.action === "decline") {
    const updated = declineCall(other.id, me.user.id);
    return NextResponse.json({ call: serialize(updated, me.user.id) });
  }

  if (body.action === "end") {
    const updated = endCall(me.user.id, other.id);
    return NextResponse.json({ call: serialize(updated, me.user.id) });
  }

  if (body.action === "ice") {
    if (!body.candidate) return NextResponse.json({ error: "Candidate wajib ada." }, { status: 400 });
    addCandidate(me.user.id, other.id, me.user.id, body.candidate);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}
