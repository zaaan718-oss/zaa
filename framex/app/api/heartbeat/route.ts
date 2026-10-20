import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateLastSeen, getUserById } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  updateLastSeen(session.user.id);

  // Kirim status ban terkini - dipakai client buat auto logout kalau ternyata
  // akun baru aja di-ban admin selagi user lagi browsing.
  const dbUser = getUserById(session.user.id);
  return NextResponse.json({ ok: true, banned: !!dbUser?.banned });
}
