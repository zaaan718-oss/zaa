import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { readBackupSnapshot, writeBackupSnapshot } from "@/lib/backup";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  writeBackupSnapshot(); // pastikan yang didownload adalah snapshot paling baru
  const buffer = readBackupSnapshot();

  if (!buffer) {
    return NextResponse.json({ error: "Belum ada data untuk di-backup." }, { status: 404 });
  }

  const filename = `framex-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
