import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Database berbasis file JSON murni (tanpa native module). Dipilih setelah
// better-sqlite3 ternyata bikin SIGSEGV di sebagian environment container
// (binary native-nya gak selalu cocok sama base image server). Pendekatan
// ini sedikit lebih sederhana tapi jauh lebih portable - jalan di mana pun
// Node.js jalan, gak ada proses compile sama sekali.

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "framex.json");

export type Plan = "free" | "pro" | "max";
export type Role = "user" | "developer" | "admin";
export type AppealStatus = "none" | "pending" | "rejected";

export interface UserRow {
  id: string;
  googleId: string;
  email: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  plan: Plan;
  role: Role; // "user" biasa, atau "developer"/"admin" yang punya wewenang moderasi chat
  banned: number; // 0/1, dipertahankan supaya konsisten dgn pemakaian di komponen lain
  banReason: string; // alasan ban, ditampilkan di halaman /banned
  appealStatus: AppealStatus; // "none" | "pending" | "rejected"
  appealText: string;
  appealSubmittedAt: number; // 0 = belum pernah ajukan banding
  onboarded: number; // 0/1 - sudah lewat halaman isi profil awal atau belum
  suspendedUntil: number; // timestamp - akun ditangguhkan sementara (deteksi spam) sampai kapan, 0 = gak ditangguhkan
  fpsUsage: number; // berapa kali sudah pakai fitur optimasi FPS
  upscaleUsage: number; // berapa kali sudah pakai fitur upgrade kualitas 1080p
  tiktokUsage: number; // berapa kali sudah pakai fitur cek video TikTok
  privateAccount: number; // 0/1 - kalau 1, profil publiknya nampilin label "Akun Privat"
  requirePermissionForDm: number; // 0/1 - kalau 1, orang lain wajib minta izin dulu sebelum bisa chat pribadi ke akun ini
  createdAt: number;
  lastSeenAt: number;
}

interface DbShape {
  users: UserRow[];
}

function ensureDb(): DbShape {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  try {
    return JSON.parse(raw) as DbShape;
  } catch {
    return { users: [] };
  }
}

function save(db: DbShape) {
  // Tulis ke file sementara dulu lalu rename - supaya kalau proses kepotong
  // di tengah jalan, file lama gak jadi rusak/setengah tertulis.
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

function slugifyUsername(base: string) {
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 16) || "user"
  );
}

function generateUniqueUsername(db: DbShape, base: string): string {
  const slug = slugifyUsername(base);
  let candidate = slug;
  let attempt = 0;
  while (db.users.some((u) => u.username === candidate)) {
    attempt += 1;
    candidate = `${slug}${Math.floor(1000 + Math.random() * 9000)}`;
    if (attempt > 20) {
      candidate = `${slug}${randomUUID().slice(0, 6)}`;
      break;
    }
  }
  return candidate;
}

export function upsertUserFromGoogle(input: {
  googleId: string;
  email: string;
  name: string;
  avatar: string;
}): UserRow {
  const db = ensureDb();
  const now = Date.now();

  const existing = db.users.find((u) => u.googleId === input.googleId);
  if (existing) {
    existing.name = input.name;
    existing.avatar = input.avatar;
    existing.lastSeenAt = now;
    save(db);
    return existing;
  }

  const usernameBase = input.email.split("@")[0] || input.name;
  const username = generateUniqueUsername(db, usernameBase);

  const newUser: UserRow = {
    id: randomUUID(),
    googleId: input.googleId,
    email: input.email,
    name: input.name,
    username,
    bio: "",
    avatar: input.avatar,
    plan: "free",
    role: "user",
    banned: 0,
    banReason: "",
    appealStatus: "none",
    appealText: "",
    appealSubmittedAt: 0,
    onboarded: 0,
    suspendedUntil: 0,
    fpsUsage: 0,
    upscaleUsage: 0,
    tiktokUsage: 0,
    privateAccount: 0,
    requirePermissionForDm: 0,
    createdAt: now,
    lastSeenAt: now,
  };
  db.users.push(newUser);
  save(db);
  return newUser;
}

export function getUserByGoogleId(googleId: string): UserRow | undefined {
  return ensureDb().users.find((u) => u.googleId === googleId);
}

export function getUserById(id: string): UserRow | undefined {
  return ensureDb().users.find((u) => u.id === id);
}

export function findUser(identifier: string): UserRow | undefined {
  const db = ensureDb();
  return db.users.find((u) => u.id === identifier || u.username === identifier);
}

export function getUserByUsername(username: string): UserRow | undefined {
  const db = ensureDb();
  return db.users.find((u) => u.username === username.toLowerCase());
}

// Beda dari findUser (exact match) - ini buat pencarian di admin, cocok
// sebagian kata di username/email/nama, hasilnya bisa banyak sekaligus.
export function searchUsers(query: string, limit = 20): UserRow[] {
  const db = ensureDb();
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return db.users
    .filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.id === q
    )
    .slice(0, limit);
}

export function updateProfile(
  id: string,
  data: { username?: string; bio?: string; avatar?: string }
): { ok: true; user: UserRow } | { ok: false; error: string } {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return { ok: false, error: "Akun tidak ditemukan." };

  if (data.username && data.username !== user.username) {
    const cleaned = data.username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) {
      return {
        ok: false,
        error: "Username 3-20 karakter, hanya huruf kecil, angka, dan underscore.",
      };
    }
    const taken = db.users.some((u) => u.username === cleaned && u.id !== id);
    if (taken) return { ok: false, error: "Username sudah dipakai." };
    user.username = cleaned;
  }

  if (data.bio !== undefined) {
    user.bio = data.bio.slice(0, 160);
  }

  if (data.avatar !== undefined && data.avatar !== "") {
    user.avatar = data.avatar;
  }

  save(db);
  return { ok: true, user };
}

// Beda dari updateProfile (data publik: username/bio/avatar) - ini khusus
// buat toggle di halaman /settings (privasi & perilaku akun).
export function updateSettings(
  id: string,
  data: { privateAccount?: boolean; requirePermissionForDm?: boolean }
): { ok: true; user: UserRow } | { ok: false; error: string } {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return { ok: false, error: "Akun tidak ditemukan." };

  if (data.privateAccount !== undefined) {
    user.privateAccount = data.privateAccount ? 1 : 0;
  }
  if (data.requirePermissionForDm !== undefined) {
    user.requirePermissionForDm = data.requirePermissionForDm ? 1 : 0;
  }

  save(db);
  return { ok: true, user };
}

export function completeOnboarding(
  id: string,
  data: { username: string; bio?: string; avatar?: string }
): { ok: true; user: UserRow } | { ok: false; error: string } {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return { ok: false, error: "Akun tidak ditemukan." };

  const cleaned = data.username.toLowerCase().trim();
  if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) {
    return {
      ok: false,
      error: "Username 3-20 karakter, hanya huruf kecil, angka, dan underscore.",
    };
  }
  const taken = db.users.some((u) => u.username === cleaned && u.id !== id);
  if (taken) return { ok: false, error: "Username sudah dipakai." };

  user.username = cleaned;
  if (data.bio !== undefined) user.bio = data.bio.slice(0, 160);
  if (data.avatar) user.avatar = data.avatar;
  user.onboarded = 1;

  save(db);
  return { ok: true, user };
}

export function updateLastSeen(id: string) {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === id);
  if (user) {
    user.lastSeenAt = Date.now();
    save(db);
  }
}

export function setPlan(identifier: string, plan: Plan): UserRow | undefined {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === identifier || u.username === identifier);
  if (!user) return undefined;
  user.plan = plan;
  save(db);
  return user;
}

export function setRole(identifier: string, role: Role): UserRow | undefined {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === identifier || u.username === identifier);
  if (!user) return undefined;
  user.role = role;
  save(db);
  return user;
}

export function isModerator(user: Pick<UserRow, "role"> | undefined | null): boolean {
  return user?.role === "admin" || user?.role === "developer";
}

// Developer/admin dikecualikan dari suspend spam otomatis.
export function isSuspended(user: Pick<UserRow, "role" | "suspendedUntil"> | undefined | null): boolean {
  if (!user || isModerator(user)) return false;
  return (user.suspendedUntil ?? 0) > Date.now();
}

export function suspendUser(id: string, durationMs: number): UserRow | undefined {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return undefined;
  user.suspendedUntil = Date.now() + durationMs;
  save(db);
  return user;
}

export function setBanned(identifier: string, banned: boolean, reason?: string): UserRow | undefined {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === identifier || u.username === identifier);
  if (!user) return undefined;
  user.banned = banned ? 1 : 0;
  // Ban baru (atau unban) = kasus baru - reset semua state banding lama
  // biar user dapat kesempatan banding yang fresh kalau kena ban lagi nanti.
  user.banReason = banned ? reason ?? "" : "";
  user.appealStatus = "none";
  user.appealText = "";
  user.appealSubmittedAt = 0;
  save(db);
  return user;
}

const APPEAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function submitAppeal(
  id: string,
  text: string
): { ok: true } | { ok: false; error: string } {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return { ok: false, error: "Akun tidak ditemukan." };
  if (!user.banned) return { ok: false, error: "Akun kamu gak sedang di-ban." };
  if (user.appealStatus === "rejected") {
    return { ok: false, error: "Pengajuan banding kamu sudah ditolak dan gak bisa diajukan lagi." };
  }
  if (user.appealStatus === "pending") {
    return { ok: false, error: "Banding kamu masih menunggu peninjauan admin." };
  }
  const last = user.appealSubmittedAt ?? 0;
  if (last && Date.now() - last < APPEAL_COOLDOWN_MS) {
    return { ok: false, error: "Kamu cuma bisa mengajukan banding 1 kali per 24 jam." };
  }
  if (!text.trim()) {
    return { ok: false, error: "Alasan banding wajib diisi." };
  }

  user.appealText = text.trim().slice(0, 500);
  user.appealStatus = "pending";
  user.appealSubmittedAt = Date.now();
  save(db);
  return { ok: true };
}

export function resolveAppeal(identifier: string, approve: boolean): UserRow | undefined {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === identifier || u.username === identifier);
  if (!user) return undefined;
  if (approve) {
    user.banned = 0;
    user.banReason = "";
    user.appealStatus = "none";
    user.appealText = "";
    user.appealSubmittedAt = 0;
  } else {
    user.appealStatus = "rejected";
  }
  save(db);
  return user;
}

export function listPendingAppeals(): UserRow[] {
  const db = ensureDb();
  return db.users.filter((u) => !!u.banned && u.appealStatus === "pending");
}

export function countUsers(): number {
  return ensureDb().users.length;
}

export function countOnline(withinMinutes = 5): number {
  const threshold = Date.now() - withinMinutes * 60 * 1000;
  return ensureDb().users.filter((u) => u.lastSeenAt > threshold).length;
}

export function getUsageTotals() {
  const db = ensureDb();
  return db.users.reduce(
    (acc, u) => {
      acc.totalFpsUsage += u.fpsUsage ?? 0;
      acc.totalUpscaleUsage += u.upscaleUsage ?? 0;
      acc.totalTiktokUsage += u.tiktokUsage ?? 0;
      return acc;
    },
    { totalFpsUsage: 0, totalUpscaleUsage: 0, totalTiktokUsage: 0 }
  );
}

export const UPLOAD_LIMITS_MB: Record<Plan, number> = {
  free: 100,
  pro: 200,
  max: 500,
};

// Kuota pemakaian - Infinity dipakai buat plan "max" (tanpa batas).
export const FPS_USAGE_LIMITS: Record<Plan, number> = {
  free: 3,
  pro: 20,
  max: Infinity,
};

export const UPSCALE_USAGE_LIMITS: Record<Plan, number> = {
  free: 1,
  pro: 20,
  max: Infinity,
};

export function incrementFpsUsage(id: string): UserRow | undefined {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return undefined;
  user.fpsUsage = (user.fpsUsage ?? 0) + 1;
  save(db);
  return user;
}

export function incrementUpscaleUsage(id: string): UserRow | undefined {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return undefined;
  user.upscaleUsage = (user.upscaleUsage ?? 0) + 1;
  save(db);
  return user;
}

export function incrementTiktokUsage(id: string): UserRow | undefined {
  const db = ensureDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) return undefined;
  user.tiktokUsage = (user.tiktokUsage ?? 0) + 1;
  save(db);
  return user;
}
