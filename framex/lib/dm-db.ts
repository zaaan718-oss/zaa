import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DM_FILE = path.join(DATA_DIR, "dm.json");
const MAX_MESSAGES_PER_CONVO = 300;
const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 menit

export interface DmMessage {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  createdAt: number;
  editedAt?: number;
  deleted?: boolean;
}

export type PermissionStatus = "none" | "pending" | "approved" | "declined";

export interface Conversation {
  id: string; // gabungan 2 user id, urutan tetap (biar konsisten)
  userIds: [string, string];
  messages: DmMessage[];
  lastReadAt: Record<string, number>; // per user id, kapan terakhir dia buka percakapan ini
  // key = id pemilik fitur "tunggu izin sebelum chat pribadi", value = status
  // izin yang diberikan ke user satunya di percakapan ini buat chat dia.
  // Gak perlu diisi kalau si pemilik gak pernah mengaktifkan fiturnya.
  permissions?: Record<string, PermissionStatus>;
}

interface DmShape {
  conversations: Conversation[];
}

function ensureDb(): DmShape {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DM_FILE)) {
    fs.writeFileSync(DM_FILE, JSON.stringify({ conversations: [] }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DM_FILE, "utf-8")) as DmShape;
  } catch {
    return { conversations: [] };
  }
}

function save(db: DmShape) {
  const tmp = `${DM_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DM_FILE);
}

function conversationId(a: string, b: string): string {
  return [a, b].sort().join("__");
}

function findOrInitConvo(db: DmShape, userA: string, userB: string): Conversation {
  const id = conversationId(userA, userB);
  let convo = db.conversations.find((c) => c.id === id);
  if (!convo) {
    convo = {
      id,
      userIds: [userA, userB].sort() as [string, string],
      messages: [],
      lastReadAt: {},
    };
    db.conversations.push(convo);
  }
  if (!convo.lastReadAt) convo.lastReadAt = {};
  return convo;
}

export function getOrCreateConversation(userA: string, userB: string): Conversation {
  const db = ensureDb();
  const convo = findOrInitConvo(db, userA, userB);
  save(db);
  return convo;
}

export function listMessages(userA: string, userB: string): DmMessage[] {
  const db = ensureDb();
  const id = conversationId(userA, userB);
  return (db.conversations.find((c) => c.id === id)?.messages ?? []).filter((m) => !m.deleted);
}

export function addMessage(input: {
  fromUserId: string;
  toUserId: string;
  text: string;
  imageUrl?: string;
}): DmMessage {
  const db = ensureDb();
  const convo = findOrInitConvo(db, input.fromUserId, input.toUserId);

  const message: DmMessage = {
    id: randomUUID(),
    senderId: input.fromUserId,
    text: input.text.slice(0, 500),
    imageUrl: input.imageUrl,
    createdAt: Date.now(),
  };
  convo.messages.push(message);
  if (convo.messages.length > MAX_MESSAGES_PER_CONVO) {
    convo.messages = convo.messages.slice(-MAX_MESSAGES_PER_CONVO);
  }

  // Siapa pun yang ngirim pesan otomatis "mengizinkan" lawan bicaranya buat
  // balas nanti - jadi kalau pemilik fitur "tunggu izin" yang duluan chat
  // orang lain, orang itu tetap bisa balas tanpa perlu ngirim permintaan izin.
  if (!convo.permissions) convo.permissions = {};
  convo.permissions[input.fromUserId] = "approved";

  save(db);
  return message;
}

// Dicek sebelum ngirim pesan: apakah "requesterId" boleh chat ke "ownerId"
// kalau ownerId punya fitur "tunggu izin sebelum chat pribadi" aktif.
export function getPermissionStatus(
  ownerId: string,
  requesterId: string
): PermissionStatus {
  if (ownerId === requesterId) return "approved";
  const db = ensureDb();
  const id = conversationId(ownerId, requesterId);
  const convo = db.conversations.find((c) => c.id === id);
  return convo?.permissions?.[ownerId] ?? "none";
}

// Dipanggil requester buat ngajuin izin chat ke ownerId.
export function requestPermission(
  ownerId: string,
  requesterId: string
): { ok: true; status: PermissionStatus } | { ok: false; error: string } {
  if (ownerId === requesterId) {
    return { ok: false, error: "Gak bisa minta izin ke diri sendiri." };
  }
  const db = ensureDb();
  const convo = findOrInitConvo(db, ownerId, requesterId);
  if (!convo.permissions) convo.permissions = {};
  const current = convo.permissions[ownerId] ?? "none";
  if (current === "approved") {
    return { ok: true, status: "approved" }; // udah diizinkan, gak perlu diajuin lagi
  }
  if (current === "pending") {
    return { ok: false, error: "Permintaan izin kamu masih menunggu." };
  }
  convo.permissions[ownerId] = "pending";
  save(db);
  return { ok: true, status: "pending" };
}

// Dipanggil ownerId (pemilik fitur) buat approve/decline permintaan dari requesterId.
export function resolvePermission(
  ownerId: string,
  requesterId: string,
  approve: boolean
): { ok: true; status: PermissionStatus } | { ok: false; error: string } {
  const db = ensureDb();
  const id = conversationId(ownerId, requesterId);
  const convo = db.conversations.find((c) => c.id === id);
  if (!convo?.permissions?.[ownerId] || convo.permissions[ownerId] !== "pending") {
    return { ok: false, error: "Gak ada permintaan izin yang menunggu dari user ini." };
  }
  convo.permissions[ownerId] = approve ? "approved" : "declined";
  save(db);
  return { ok: true, status: convo.permissions[ownerId] };
}

export function editMessage(
  userA: string,
  userB: string,
  messageId: string,
  requesterId: string,
  newText: string
): { ok: true; message: DmMessage } | { ok: false; error: string } {
  const db = ensureDb();
  const id = conversationId(userA, userB);
  const convo = db.conversations.find((c) => c.id === id);
  const msg = convo?.messages.find((m) => m.id === messageId);

  if (!convo || !msg || msg.deleted) return { ok: false, error: "Pesan tidak ditemukan." };
  if (msg.senderId !== requesterId) return { ok: false, error: "Bukan pesan kamu." };
  if (Date.now() - msg.createdAt > EDIT_WINDOW_MS) {
    return { ok: false, error: "Waktu edit (5 menit) sudah lewat." };
  }

  msg.text = newText.slice(0, 500);
  msg.editedAt = Date.now();
  save(db);
  return { ok: true, message: msg };
}

export function deleteMessage(
  userA: string,
  userB: string,
  messageId: string,
  requesterId: string
): { ok: true } | { ok: false; error: string } {
  const db = ensureDb();
  const id = conversationId(userA, userB);
  const convo = db.conversations.find((c) => c.id === id);
  const msg = convo?.messages.find((m) => m.id === messageId);

  if (!convo || !msg) return { ok: false, error: "Pesan tidak ditemukan." };
  if (msg.senderId !== requesterId) return { ok: false, error: "Bukan pesan kamu." };

  msg.deleted = true;
  save(db);
  return { ok: true };
}

export function markRead(userId: string, otherUserId: string) {
  const db = ensureDb();
  const convo = findOrInitConvo(db, userId, otherUserId);
  convo.lastReadAt[userId] = Date.now();
  save(db);
}

// Daftar percakapan milik seorang user, diurutkan dari yang paling baru dibalas.
// Percakapan yang belum ada pesannya SAMA SEKALI tetap diikutkan kalau ada
// permintaan izin chat yang nunggu persetujuan user ini - biar gak "hilang"
// dari inbox cuma karena lawan bicaranya belum bisa ngirim pesan apa-apa.
export function listConversationsForUser(userId: string): Conversation[] {
  const db = ensureDb();
  return db.conversations
    .filter(
      (c) =>
        c.userIds.includes(userId) &&
        (c.messages.some((m) => !m.deleted) || c.permissions?.[userId] === "pending")
    )
    .sort((a, b) => {
      const lastA = a.messages[a.messages.length - 1]?.createdAt ?? 0;
      const lastB = b.messages[b.messages.length - 1]?.createdAt ?? 0;
      return lastB - lastA;
    });
}

export function countUnread(convo: Conversation, userId: string): number {
  const lastRead = convo.lastReadAt?.[userId] ?? 0;
  return convo.messages.filter((m) => !m.deleted && m.senderId !== userId && m.createdAt > lastRead)
    .length;
}

export function otherUserId(convo: Conversation, myId: string): string {
  return convo.userIds[0] === myId ? convo.userIds[1] : convo.userIds[0];
}
