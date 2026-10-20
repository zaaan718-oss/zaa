import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_FILE = path.join(DATA_DIR, "backup.json");

// Semua file data yang digabung jadi satu snapshot. Kalau nanti nambah
// fitur baru yang punya file data sendiri, tambahin nama filenya di sini juga.
const SOURCE_FILES = ["framex.json", "chat.json", "dm.json", "audit.json", "announcement.json"];

// Digabung jadi 1 file (data/backup.json) tiap ada user login, supaya kalau
// suatu saat ada masalah di server (misal salah hapus folder pas update),
// masih ada 1 file gabungan yang bisa dipakai buat restore data.
//
// PENTING: file ini tetap ada di dalam folder data/ yang sama, jadi kalau
// folder data/ keseluruhan yang kehapus, backup ini ikut hilang juga. Buat
// perlindungan beneran, download file ini sesekali lewat halaman admin
// (tombol "Download Backup") dan simpan di komputer kamu sendiri.
export function writeBackupSnapshot() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const snapshot: Record<string, unknown> = { snapshotAt: Date.now() };
    for (const file of SOURCE_FILES) {
      const filePath = path.join(DATA_DIR, file);
      if (fs.existsSync(filePath)) {
        try {
          snapshot[file] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch {
          // file rusak/gagal parse - skip aja, jangan sampai bikin backup gagal total
        }
      }
    }

    const tmp = `${BACKUP_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2));
    fs.renameSync(tmp, BACKUP_FILE);
  } catch (err) {
    console.error("[backup] Gagal membuat snapshot:", err);
  }
}

export function readBackupSnapshot(): Buffer | null {
  if (!fs.existsSync(BACKUP_FILE)) return null;
  return fs.readFileSync(BACKUP_FILE);
}
