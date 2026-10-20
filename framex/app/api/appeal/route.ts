import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { submitAppeal } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Alasan banding wajib diisi." }, { status: 400 });
  }

  const result = submitAppeal(session.user.id, text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
