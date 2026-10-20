"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShieldCheck,
  LogOut,
  BadgeCheck,
  Ban,
  UserCog,
  Flag,
  Trash2,
  Check,
  Users,
  Radio,
  Zap,
  Sparkles,
  Music2,
  MessageCircle,
  Megaphone,
  History,
  X,
  Download,
  ShieldAlert,
} from "lucide-react";
import CountUp from "@/components/CountUp";

interface Appeal {
  id: string; // sebenarnya user id
  username: string;
  banReason: string;
  appealText: string;
  appealSubmittedAt: number;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  name: string;
  plan: "free" | "pro" | "max";
  role: "user" | "developer" | "admin";
  banned: number;
  createdAt: number;
  fpsUsage: number;
  upscaleUsage: number;
  tiktokUsage: number;
}

interface Report {
  id: string;
  type: "message" | "account";
  category: "spam" | "other";
  messageId?: string;
  targetUsername?: string;
  contextMessages?: string[];
  reporterUsername: string;
  reason: string;
  createdAt: number;
  message: { id: string; username: string; authorId: string; text: string; imageUrl?: string } | null;
}

interface Stats {
  totalUsers: number;
  onlineUsers: number;
  totalFpsUsage: number;
  totalUpscaleUsage: number;
  totalTiktokUsage: number;
  totalChatMessages: number;
  chatMessagesToday: number;
  pendingReports: number;
}

interface AuditEntry {
  id: string;
  action: string;
  targetUsername?: string;
  detail?: string;
  reason?: string;
  createdAt: number;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min}m lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j lalu`;
  return `${Math.floor(hr / 24)}h lalu`;
}

export default function AdminDashboard({ logoutAction }: { logoutAction: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [appealsLoading, setAppealsLoading] = useState(true);

  const [stats, setStats] = useState<Stats | null>(null);

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);

  const [announcementText, setAnnouncementText] = useState("");
  const [announcementMsg, setAnnouncementMsg] = useState<string | null>(null);
  const [announcementSaving, setAnnouncementSaving] = useState(false);

  async function loadReports() {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      setReports(data.reports ?? []);
    } finally {
      setReportsLoading(false);
    }
  }

  async function loadAppeals() {
    setAppealsLoading(true);
    try {
      const res = await fetch("/api/admin/appeals");
      const data = await res.json();
      setAppeals(data.appeals ?? []);
    } finally {
      setAppealsLoading(false);
    }
  }

  async function handleAppeal(identifier: string, approve: boolean) {
    await fetch("/api/admin/appeals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, approve }),
    });
    setAppeals((prev) => prev.filter((a) => a.id !== identifier));
  }

  async function loadStats() {
    const res = await fetch("/api/admin/stats");
    const data = await res.json();
    setStats(data);
  }

  async function loadAudit() {
    const res = await fetch("/api/admin/audit");
    const data = await res.json();
    setAudit(data.entries ?? []);
  }

  useEffect(() => {
    loadReports();
    loadAppeals();
    loadStats();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(identifier: string, plan: "free" | "pro" | "max") {
    setMessage(null);
    const res = await fetch("/api/admin/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Gagal upgrade.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === data.user.id ? { ...u, ...data.user } : u)));
    setMessage(`Berhasil upgrade @${data.user.username} ke ${plan}.`);
  }

  async function handleRole(identifier: string, role: "user" | "developer" | "admin") {
    setMessage(null);
    const res = await fetch("/api/admin/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Gagal mengubah role.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === data.user.id ? { ...u, ...data.user } : u)));
    setMessage(`Role @${data.user.username} diubah jadi ${role}.`);
  }

  async function handleBan(identifier: string, banned: boolean) {
    setMessage(null);
    let reason: string | undefined;
    if (banned) {
      reason = window.prompt("Alasan ban (akan ditampilkan ke user):") ?? undefined;
      if (reason === undefined) return; // dibatalkan
    }
    const res = await fetch("/api/admin/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, banned, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Gagal memperbarui status ban.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === data.user.id ? { ...u, ...data.user } : u)));
    setMessage(banned ? `@${data.user.username} telah di-ban.` : `@${data.user.username} di-unban.`);
  }

  async function handleReportAction(
    report: Report,
    action: "dismiss" | "delete_message" | "delete_and_ban" | "ban_account" | "suspend",
    suspendMinutes?: number
  ) {
    await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: report.id,
        action,
        messageId: report.message?.id,
        authorId: report.message?.authorId,
        targetUsername: report.targetUsername,
        reason: report.reason,
        suspendMinutes,
      }),
    });
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    loadStats();
  }

  async function handleSetAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setAnnouncementSaving(true);
    setAnnouncementMsg(null);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: announcementText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnnouncementMsg(data.error || "Gagal mengirim pengumuman.");
        return;
      }
      setAnnouncementMsg("Pengumuman terpasang, muncul di beranda semua user.");
      setAnnouncementText("");
    } finally {
      setAnnouncementSaving(false);
    }
  }

  async function handleClearAnnouncement() {
    setAnnouncementSaving(true);
    setAnnouncementMsg(null);
    try {
      await fetch("/api/admin/announcement", { method: "DELETE" });
      setAnnouncementMsg("Pengumuman dicopot.");
    } finally {
      setAnnouncementSaving(false);
    }
  }

  function toggleAudit() {
    if (!auditOpen) loadAudit();
    setAuditOpen((v) => !v);
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 @lg:px-10 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
            FrameX <span className="text-yellow-400">Admin</span>
          </h1>
          <div className="flex items-center gap-4">
            <a
              href="/api/admin/backup"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-yellow-400 transition"
            >
              <Download size={14} />
              Backup
            </a>
            <form action={logoutAction}>
              <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-yellow-400 transition">
                <LogOut size={14} />
                Keluar
              </button>
            </form>
          </div>
        </div>

        {/* Statistik ringkas */}
        {stats && (
          <section className="grid grid-cols-2 @lg:grid-cols-4 gap-3 mb-10">
            <StatBox icon={Users} label="Total User" value={stats.totalUsers} />
            <StatBox icon={Radio} label="Online" value={stats.onlineUsers} accent="text-emerald-400" />
            <StatBox icon={Zap} label="Optimasi FPS" value={stats.totalFpsUsage} />
            <StatBox icon={Sparkles} label="Upgrade 1080p" value={stats.totalUpscaleUsage} />
            <StatBox icon={Music2} label="Cek TikTok" value={stats.totalTiktokUsage} />
            <StatBox icon={MessageCircle} label="Chat (semua)" value={stats.totalChatMessages} />
            <StatBox icon={MessageCircle} label="Chat Hari Ini" value={stats.chatMessagesToday} />
            <StatBox
              icon={Flag}
              label="Laporan Pending"
              value={stats.pendingReports}
              accent={stats.pendingReports > 0 ? "text-yellow-400" : undefined}
            />
          </section>
        )}

        {/* Broadcast pengumuman */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
            <Megaphone size={14} className="text-yellow-400" />
            Kirim Pengumuman
          </h2>
          <form onSubmit={handleSetAnnouncement} className="flex flex-col @lg:flex-row gap-3">
            <input
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Tulis pengumuman buat semua user..."
              maxLength={300}
              className="flex-1 rounded-xl border border-yellow-500/20 bg-zinc-900/60 px-4 py-2.5 text-sm outline-none focus:border-yellow-400/60"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={announcementSaving}
                className="flex-1 @lg:flex-none rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-60"
              >
                Kirim
              </button>
              <button
                type="button"
                onClick={handleClearAnnouncement}
                disabled={announcementSaving}
                className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:border-red-500/40 hover:text-red-400 transition"
              >
                Copot
              </button>
            </div>
          </form>
          {announcementMsg && <p className="text-xs text-yellow-400 mt-2">{announcementMsg}</p>}
        </section>

        {/* Pengajuan banding akun yang di-ban */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
            <ShieldAlert size={14} className="text-yellow-400" />
            Pengajuan Banding {appeals.length > 0 && `(${appeals.length})`}
          </h2>

          {appealsLoading ? (
            <p className="text-sm text-zinc-600">Memuat...</p>
          ) : appeals.length === 0 ? (
            <p className="text-sm text-zinc-600">Gak ada pengajuan banding yang menunggu.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {appeals.map((a) => (
                <div key={a.id} className="rounded-xl border border-yellow-500/20 bg-zinc-900/60 p-4">
                  <p className="text-sm font-medium mb-2">@{a.username}</p>
                  <div className="rounded-lg bg-black/40 border border-zinc-800 px-3 py-2 mb-2">
                    <p className="text-[10px] text-zinc-500 mb-1">Alasan ban:</p>
                    <p className="text-xs text-zinc-300">{a.banReason || "-"}</p>
                  </div>
                  <div className="rounded-lg bg-black/40 border border-yellow-500/20 px-3 py-2 mb-3">
                    <p className="text-[10px] text-zinc-500 mb-1">Alasan banding:</p>
                    <p className="text-xs text-yellow-100">{a.appealText}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAppeal(a.id, true)}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition"
                    >
                      <Check size={12} />
                      Terima & Unban
                    </button>
                    <button
                      onClick={() => handleAppeal(a.id, false)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
                    >
                      <X size={12} />
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Laporan chat masuk */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
            <Flag size={14} className="text-yellow-400" />
            Laporan Masuk {reports.length > 0 && `(${reports.length})`}
          </h2>

          {reportsLoading ? (
            <p className="text-sm text-zinc-600">Memuat laporan...</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-zinc-600">Gak ada laporan yang menunggu.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((r) => (
                <div key={r.id} className="rounded-xl border border-yellow-500/20 bg-zinc-900/60 p-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-xs text-zinc-500">
                      Dilaporkan oleh <span className="text-zinc-300">@{r.reporterUsername}</span>
                    </p>
                    {r.category === "spam" && (
                      <span className="text-[10px] uppercase tracking-wide rounded-full border border-red-500/40 text-red-400 px-2 py-0.5">
                        Spam
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-yellow-400/90 mb-2">Alasan: {r.reason}</p>

                  {r.category === "spam" && r.contextMessages && r.contextMessages.length > 0 && (
                    <div className="rounded-lg bg-black/40 border border-red-500/20 px-3 py-2 mb-3">
                      <p className="text-[10px] text-zinc-500 mb-1.5">
                        5 pesan terakhir dari @{r.targetUsername}:
                      </p>
                      <div className="flex flex-col gap-1">
                        {r.contextMessages.map((msg, i) => (
                          <p key={i} className="text-xs text-zinc-300 truncate">
                            • {msg}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.type === "account" ? (
                    <div className="rounded-lg bg-black/40 border border-zinc-800 px-3 py-2 mb-3">
                      <p className="text-xs text-zinc-400">
                        Melaporkan akun <span className="text-zinc-200">@{r.targetUsername}</span> secara
                        keseluruhan.
                      </p>
                    </div>
                  ) : r.message ? (
                    <div className="rounded-lg bg-black/40 border border-zinc-800 px-3 py-2 mb-3">
                      <p className="text-xs text-zinc-500 mb-1">@{r.message.username}</p>
                      {r.message.text && <p className="text-sm text-zinc-200">{r.message.text}</p>}
                      {r.message.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.message.imageUrl} alt="" className="mt-1.5 max-h-40 rounded-lg" />
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 italic mb-3">Pesan sudah dihapus.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleReportAction(r, "dismiss")}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-400/60 hover:text-emerald-400 transition"
                    >
                      <Check size={12} />
                      Abaikan
                    </button>
                    {r.type === "account" && r.category === "spam" && (
                      <>
                        {[5, 1, 10].map((min) => (
                          <button
                            key={min}
                            onClick={() => handleReportAction(r, "suspend", min)}
                            className="flex items-center gap-1.5 rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/10 transition"
                          >
                            Suspend {min}m
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            const input = window.prompt("Suspend berapa menit?", "15");
                            const minutes = Number(input);
                            if (input && minutes > 0) handleReportAction(r, "suspend", minutes);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-yellow-500/40 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/10 transition"
                        >
                          Custom
                        </button>
                      </>
                    )}
                    {r.type === "account" && (
                      <button
                        onClick={() => handleReportAction(r, "ban_account")}
                        className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
                      >
                        <Ban size={12} />
                        Ban Akun
                      </button>
                    )}
                    {r.type === "message" && r.message && (
                      <>
                        <button
                          onClick={() => handleReportAction(r, "delete_message")}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-yellow-400/60 hover:text-yellow-400 transition"
                        >
                          <Trash2 size={12} />
                          Hapus Pesan
                        </button>
                        <button
                          onClick={() => handleReportAction(r, "delete_and_ban")}
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Ban size={12} />
                          Hapus & Ban
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Log aktivitas admin */}
        <section className="mb-10">
          <button
            onClick={toggleAudit}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3 hover:text-yellow-400 transition"
          >
            <History size={14} className={auditOpen ? "text-yellow-400" : ""} />
            Log Aktivitas Admin
            <span className="text-xs text-zinc-600">{auditOpen ? "(sembunyikan)" : "(tampilkan)"}</span>
          </button>

          {auditOpen && (
            <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto rounded-xl border border-zinc-800 bg-black/40 p-3">
              {audit.length === 0 ? (
                <p className="text-sm text-zinc-600 px-1">Belum ada aktivitas tercatat.</p>
              ) : (
                audit.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 text-xs px-1 py-1.5">
                    <span className="text-zinc-400">
                      <span className="text-yellow-400/90 font-medium">{entry.action}</span>
                      {entry.targetUsername && (
                        <>
                          {" "}
                          → <span className="text-zinc-200">@{entry.targetUsername}</span>
                        </>
                      )}
                      {entry.detail && <span className="text-zinc-600"> ({entry.detail})</span>}
                    </span>
                    <span className="text-zinc-600 shrink-0">{timeAgo(entry.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Cari & kelola user */}
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Kelola User</h2>
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari username, email, atau ID..."
              className="w-full rounded-xl border border-yellow-500/20 bg-zinc-900/60 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-yellow-400/60"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-60"
          >
            {loading ? "Mencari..." : "Cari"}
          </button>
        </form>

        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-yellow-400 mb-4"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>

        {searched && users.length === 0 && (
          <p className="text-sm text-zinc-500">Tidak ditemukan user yang cocok.</p>
        )}

        <div className="flex flex-col gap-4">
          {users.map((u) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-yellow-500/20 bg-zinc-900/60 p-5"
            >
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <p className="font-medium">
                    {u.name} <span className="text-zinc-500">@{u.username}</span>
                  </p>
                  <p className="text-xs text-zinc-500 font-[family-name:var(--font-mono)]">{u.email}</p>
                  <p className="text-xs text-zinc-600 font-[family-name:var(--font-mono)] mt-0.5">
                    ID: {u.id}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wide rounded-full border border-yellow-400/30 text-yellow-400 px-2.5 py-1">
                    {u.plan}
                  </span>
                  {u.role !== "user" && (
                    <span
                      className={`text-[11px] uppercase tracking-wide rounded-full border px-2.5 py-1 ${
                        u.role === "admin"
                          ? "border-yellow-500/40 text-yellow-400"
                          : "border-emerald-500/40 text-emerald-400"
                      }`}
                    >
                      {u.role}
                    </span>
                  )}
                  {!!u.banned && (
                    <span className="text-[11px] uppercase tracking-wide rounded-full border border-red-500/40 text-red-400 px-2.5 py-1">
                      banned
                    </span>
                  )}
                </div>
              </div>

              {/* Statistik pemakaian fitur user ini */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-lg bg-black/40 border border-zinc-800 px-3 py-2">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Optimasi FPS</p>
                  <p className="text-sm font-semibold font-[family-name:var(--font-mono)]">
                    {u.fpsUsage ?? 0}x
                  </p>
                </div>
                <div className="rounded-lg bg-black/40 border border-zinc-800 px-3 py-2">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Upgrade 1080p</p>
                  <p className="text-sm font-semibold font-[family-name:var(--font-mono)]">
                    {u.upscaleUsage ?? 0}x
                  </p>
                </div>
                <div className="rounded-lg bg-black/40 border border-zinc-800 px-3 py-2">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Cek TikTok</p>
                  <p className="text-sm font-semibold font-[family-name:var(--font-mono)]">
                    {u.tiktokUsage ?? 0}x
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-[10px] text-zinc-600 self-center mr-1">Plan:</span>
                {(["free", "pro", "max"] as const).map((plan) => (
                  <button
                    key={plan}
                    onClick={() => handleUpgrade(u.id, plan)}
                    disabled={u.plan === plan}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-yellow-400/60 hover:text-yellow-400 transition disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:text-zinc-300"
                  >
                    <BadgeCheck size={13} />
                    {plan}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-[10px] text-zinc-600 self-center mr-1">Role:</span>
                {(["user", "developer", "admin"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRole(u.id, role)}
                    disabled={u.role === role}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-yellow-400/60 hover:text-yellow-400 transition disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:text-zinc-300"
                  >
                    <UserCog size={13} />
                    {role}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {u.banned ? (
                  <button
                    onClick={() => handleBan(u.id, false)}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition"
                  >
                    <ShieldCheck size={13} />
                    Unban
                  </button>
                ) : (
                  <button
                    onClick={() => handleBan(u.id, true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
                  >
                    <Ban size={13} />
                    Ban
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-yellow-500/20 bg-zinc-900/60 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mb-1">
        <Icon size={11} className={accent} />
        {label}
      </div>
      <p className={`text-lg font-semibold font-[family-name:var(--font-mono)] ${accent ?? ""}`}>
        <CountUp value={value} />
      </p>
    </div>
  );
}
