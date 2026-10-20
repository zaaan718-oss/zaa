import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const AUDIT_FILE = path.join(DATA_DIR, "audit.json");

export interface AuditEntry {
  id: string;
  action: string; // "ban" | "unban" | "set_plan" | "set_role" | "resolve_report" | "broadcast"
  targetUsername?: string;
  detail?: string;
  reason?: string;
  createdAt: number;
}

interface AuditShape {
  entries: AuditEntry[];
}

const MAX_ENTRIES = 500;

function ensureAuditDb(): AuditShape {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(AUDIT_FILE)) {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify({ entries: [] }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(AUDIT_FILE, "utf-8")) as AuditShape;
  } catch {
    return { entries: [] };
  }
}

function save(db: AuditShape) {
  const tmp = `${AUDIT_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, AUDIT_FILE);
}

export function logAudit(entry: {
  action: string;
  targetUsername?: string;
  detail?: string;
  reason?: string;
}) {
  const db = ensureAuditDb();
  db.entries.push({
    id: randomUUID(),
    action: entry.action,
    targetUsername: entry.targetUsername,
    detail: entry.detail,
    reason: entry.reason,
    createdAt: Date.now(),
  });
  if (db.entries.length > MAX_ENTRIES) {
    db.entries = db.entries.slice(-MAX_ENTRIES);
  }
  save(db);
}

export function listAudit(limit = 50): AuditEntry[] {
  const db = ensureAuditDb();
  return db.entries.slice(-limit).reverse();
}
