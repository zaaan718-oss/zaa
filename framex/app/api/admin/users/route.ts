import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { searchUsers } from "@/lib/db";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ users: [] });

  return NextResponse.json({ users: searchUsers(q, 20) });
}
