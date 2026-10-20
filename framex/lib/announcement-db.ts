import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "announcement.json");

export interface Announcement {
  id: string;
  text: string;
  createdAt: number;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getAnnouncement(): Announcement | null {
  ensureDir();
  if (!fs.existsSync(FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    return data.id ? data : null;
  } catch {
    return null;
  }
}

export function setAnnouncement(text: string): Announcement {
  ensureDir();
  const announcement: Announcement = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.slice(0, 300),
    createdAt: Date.now(),
  };
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(announcement, null, 2));
  fs.renameSync(tmp, FILE);
  return announcement;
}

export function clearAnnouncement() {
  ensureDir();
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({}, null, 2));
  fs.renameSync(tmp, FILE);
}
