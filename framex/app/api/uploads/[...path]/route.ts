import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  svg: "image/svg+xml",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  // Sanitasi tiap segment - cegah path traversal (../../dst)
  const safeSegments = segments.map((s) => s.replace(/[^a-zA-Z0-9._-]/g, ""));
  const filePath = path.join(UPLOADS_DIR, ...safeSegments);

  // Pastikan hasil akhirnya tetap di dalam UPLOADS_DIR
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: "Path tidak valid." }, { status: 400 });
  }

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  }
}
