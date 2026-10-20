"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MessageSquare, CheckCircle2, Flag, X, Lock } from "lucide-react";

interface Props {
  username: string;
  name: string;
  bio: string;
  avatar: string;
  plan: "free" | "pro" | "max";
  role: "user" | "developer" | "admin";
  createdAt: number;
  isMe: boolean;
  privateAccount: boolean;
}

export default function PublicProfileClient({
  username,
  name,
  bio,
  avatar,
  plan,
  role,
  createdAt,
  isMe,
  privateAccount,
}: Props) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<"spam" | "other">("other");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const joined = new Date(createdAt).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  async function submitReport() {
    if (!reason.trim()) return;
    const res = await fetch(`/api/users/${username}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim(), category: reportCategory }),
    });
    const data = await res.json();
    setReportOpen(false);
    setReason("");
    setMessage(res.ok ? "Laporan terkirim ke admin." : data.error || "Gagal mengirim laporan.");
  }

  return (
    <main className="min-h-screen text-white px-6 @lg:px-10 py-10">
      <div className="max-w-lg mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-yellow-400 transition mb-8"
        >
          <ArrowLeft size={15} />
          Kembali
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-yellow-500/20 bg-zinc-900/60 p-6 @lg:p-8 flex flex-col items-center text-center"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-20 w-20 rounded-full object-cover mb-4" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-zinc-800 mb-4" />
          )}

          {role !== "user" && (
            <div
              className={`flex items-center gap-1.5 text-xs font-medium mb-2 ${
                role === "admin" ? "text-yellow-400" : "text-emerald-400"
              }`}
            >
              {role}
              <CheckCircle2
                size={13}
                className={role === "admin" ? "text-yellow-400" : "text-emerald-400"}
                fill="currentColor"
                fillOpacity={0.15}
              />
            </div>
          )}

          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold mb-0.5">{name}</h1>
          <p className="text-sm text-zinc-500 mb-3">@{username}</p>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500 border border-zinc-700 rounded-full px-2.5 py-1">
              {plan}
            </span>
            {privateAccount && (
              <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-yellow-400 border border-yellow-500/30 rounded-full px-2.5 py-1">
                <Lock size={10} />
                Akun Privat
              </span>
            )}
          </div>

          {bio && <p className="text-sm text-zinc-300 leading-relaxed mb-4 max-w-sm">{bio}</p>}

          <p className="text-xs text-zinc-600 mb-6">Bergabung sejak {joined}</p>

          {!isMe && (
            <div className="flex items-center gap-2">
              <Link
                href={`/dm/${username}`}
                className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition"
              >
                <MessageSquare size={16} />
                Kirim Pesan
              </Link>
              <button
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:border-red-500/40 hover:text-red-400 transition"
              >
                <Flag size={14} />
                Laporkan
              </button>
            </div>
          )}

          {message && <p className="text-xs text-yellow-400 mt-4">{message}</p>}
        </motion.div>
      </div>

      <AnimatePresence>
        {reportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setReportOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-yellow-500/20 bg-zinc-900/95 p-6"
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                  Laporkan @{username}
                </h2>
                <button onClick={() => setReportOpen(false)} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-zinc-500 mb-2">Alasan laporan</p>
              <div className="flex gap-2 mb-4">
                {(["spam", "other"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setReportCategory(cat)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs transition ${
                      reportCategory === cat
                        ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {cat === "spam" ? "Spam" : "Lainnya"}
                  </button>
                ))}
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan lebih lanjut..."
                rows={3}
                maxLength={300}
                autoFocus
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60 resize-none mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitReport}
                  disabled={!reason.trim()}
                  className="flex-1 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-50"
                >
                  Kirim Laporan
                </button>
                <button
                  onClick={() => setReportOpen(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-500 transition"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
