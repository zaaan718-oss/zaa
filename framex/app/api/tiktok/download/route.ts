import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Whitelist domain sumber video supaya route ini gak disalahgunakan
// jadi proxy download bebas ke URL sembarangan (open proxy risk).
const ALLOWED_HOSTS = ["tikwm.com", "www.tikwm.com", "v16-webapp.tiktok.com", "v9-webapp.tiktok.com"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const src = req.nextUrl.searchParams.get("src");
  const title = req.nextUrl.searchParams.get("title") || "framex-tiktok";

  if (!src) {
    return NextResponse.json({ error: "Parameter src wajib diisi." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return NextResponse.json({ error: "URL sumber tidak valid." }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: "Sumber video tidak diizinkan." }, { status: 400 });
  }

  const upstream = await fetch(src, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.tikwm.com/" },
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Gagal mengambil video dari sumber." }, { status: 502 });
  }

  const safeFilename = title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 60) || "framex-tiktok";

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${safeFilename}.mp4"`,
    },
  });
}
