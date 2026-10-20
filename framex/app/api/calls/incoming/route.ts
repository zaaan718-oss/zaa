import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/db";
import { findIncomingRinging } from "@/lib/call-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ call: null });
  }

  const ringing = findIncomingRinging(session.user.id);
  if (!ringing) return NextResponse.json({ call: null });

  const caller = getUserById(ringing.callerId);
  return NextResponse.json({
    call: {
      username: caller?.username ?? "pengguna",
      name: caller?.name ?? "Pengguna",
      avatar: caller?.avatar ?? "",
    },
  });
}
