import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAdminToken, COOKIE_NAME } from "./admin-auth";

export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const valid = verifyAdminToken(cookieStore.get(COOKIE_NAME)?.value);
  if (!valid) {
    return NextResponse.json({ error: "Tidak diotorisasi." }, { status: 401 });
  }
  return null;
}
