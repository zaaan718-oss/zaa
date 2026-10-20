import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Simpan gambar (avatar, foto chat) sebagai FILE beneran di data/uploads
// (bukan folder public/) - lalu di-serve lewat route API sendiri
// (/api/uploads/...). Ini sengaja TIDAK pakai folder public/ karena static
// file serving Next.js bisa gak konsisten tergantung struktur deployment
// (misal kalau app-nya ditaruh di subfolder lewat package.json penghubung).
// Dengan cara ini, proses TULIS dan BACA filenya sama-sama lewat kode kita
// sendiri, jadi selalu konsisten gak peduli struktur foldernya gimana.
const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

export async function saveBase64Image(dataUrl: string, subfolder: string): Promise<string> {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error("Format gambar tidak valid.");
  }
  const mime = match[1];
  const ext = mime.split("/")[1].replace("jpeg", "jpg").replace("svg+xml", "svg");
  const buffer = Buffer.from(match[2], "base64");

  const dir = path.join(UPLOADS_DIR, subfolder);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, buffer);
  console.log(`[uploads] Foto disimpan di: ${fullPath}`);

  return `/api/uploads/${subfolder}/${filename}`;
}

export function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  const raw = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.floor((raw.length * 3) / 4);
}

export function resolveUploadPath(subfolder: string, filename: string): string {
  return path.join(UPLOADS_DIR, subfolder, filename);
}
