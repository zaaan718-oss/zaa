import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { Plan, Role } from "@/lib/db";

const DATA_DIR = path.join(process.cwd(), "data");
const CHAT_FILE = path.join(DATA_DIR, "chat.json");

export interface ChatMessage {
  id: string;
  authorId: string;
  username: string;
  avatar: string;
  role: Role;
  plan: Plan;
  text: string;
  imageUrl?: string;
  createdAt: number;
  deleted: boolean;
}

export interface ChatReport {
  id: string;
  type: "message" | "account";
  category: "spam" | "other";
  messageId?: string;
  targetUsername?: string; // dipakai buat report akun (bukan pesan spesifik)
  contextMessages?: string[]; // snapshot 5 chat terakhir dari yang dilaporkan (khusus laporan spam)
  reporterId: string;
  reporterUsername: string;
  reason: string;
  createdAt: number;
  resolved: boolean;
}

interface ChatShape {
  messages: ChatMessage[];
  reports: ChatReport[];
}

const MAX_STORED_MESSAGES = 500; // biar file gak numpuk gak terbatas

function ensureChatDb(): ChatShape {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CHAT_FILE)) {
    fs.writeFileSync(CHAT_FILE, JSON.stringify({ messages: [], reports: [] }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(CHAT_FILE, "utf-8")) as ChatShape;
  } catch {
    return { messages: [], reports: [] };
  }
}

function save(db: ChatShape) {
  const tmp = `${CHAT_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, CHAT_FILE);
}

export function listMessages(limit = 100): ChatMessage[] {
  const db = ensureChatDb();
  return db.messages
    .filter((m) => !m.deleted)
    .slice(-limit);
}

export function addMessage(input: {
  authorId: string;
  username: string;
  avatar: string;
  role: Role;
  plan: Plan;
  text: string;
  imageUrl?: string;
}): ChatMessage {
  const db = ensureChatDb();
  const message: ChatMessage = {
    id: randomUUID(),
    authorId: input.authorId,
    username: input.username,
    avatar: input.avatar,
    role: input.role,
    plan: input.plan,
    text: input.text.slice(0, 500),
    imageUrl: input.imageUrl,
    createdAt: Date.now(),
    deleted: false,
  };
  db.messages.push(message);
  if (db.messages.length > MAX_STORED_MESSAGES) {
    db.messages = db.messages.slice(-MAX_STORED_MESSAGES);
  }
  save(db);
  return message;
}

export function getMessage(id: string): ChatMessage | undefined {
  return ensureChatDb().messages.find((m) => m.id === id);
}

export function deleteMessage(id: string): boolean {
  const db = ensureChatDb();
  const msg = db.messages.find((m) => m.id === id);
  if (!msg) return false;
  msg.deleted = true;
  save(db);
  return true;
}

export function reportMessage(input: {
  messageId: string;
  reporterId: string;
  reporterUsername: string;
  reason: string;
}): { ok: true } | { ok: false; error: string } {
  const db = ensureChatDb();
  const msg = db.messages.find((m) => m.id === input.messageId);
  if (!msg || msg.deleted) return { ok: false, error: "Pesan tidak ditemukan." };

  const already = db.reports.some(
    (r) => r.messageId === input.messageId && r.reporterId === input.reporterId && !r.resolved
  );
  if (already) return { ok: false, error: "Kamu sudah melaporkan pesan ini." };

  db.reports.push({
    id: randomUUID(),
    type: "message",
    category: "other",
    messageId: input.messageId,
    reporterId: input.reporterId,
    reporterUsername: input.reporterUsername,
    reason: input.reason.slice(0, 300),
    createdAt: Date.now(),
    resolved: false,
  });
  save(db);
  return { ok: true };
}

export function reportAccount(input: {
  targetUsername: string;
  reporterId: string;
  reporterUsername: string;
  reason: string;
  category?: "spam" | "other";
  contextMessages?: string[];
}): { ok: true } | { ok: false; error: string } {
  const db = ensureChatDb();

  const already = db.reports.some(
    (r) =>
      r.type === "account" &&
      r.targetUsername === input.targetUsername &&
      r.reporterId === input.reporterId &&
      !r.resolved
  );
  if (already) return { ok: false, error: "Kamu sudah melaporkan akun ini." };

  db.reports.push({
    id: randomUUID(),
    type: "account",
    category: input.category ?? "other",
    targetUsername: input.targetUsername,
    contextMessages: input.contextMessages?.slice(0, 5),
    reporterId: input.reporterId,
    reporterUsername: input.reporterUsername,
    reason: input.reason.slice(0, 300),
    createdAt: Date.now(),
    resolved: false,
  });
  save(db);
  return { ok: true };
}

export function listPendingReports(): (ChatReport & { message: ChatMessage | null })[] {
  const db = ensureChatDb();
  return db.reports
    .filter((r) => !r.resolved)
    .map((r) => ({
      ...r,
      message: r.messageId ? db.messages.find((m) => m.id === r.messageId) ?? null : null,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function resolveReport(id: string): boolean {
  const db = ensureChatDb();
  const report = db.reports.find((r) => r.id === id);
  if (!report) return false;
  report.resolved = true;
  save(db);
  return true;
}

export function getChatStats() {
  const db = ensureChatDb();
  const active = db.messages.filter((m) => !m.deleted);
  const todayStart = new Date().setHours(0, 0, 0, 0);
  return {
    totalMessages: active.length,
    messagesToday: active.filter((m) => m.createdAt >= todayStart).length,
    pendingReports: db.reports.filter((r) => !r.resolved).length,
  };
}
