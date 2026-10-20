"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Send, Clock, XCircle } from "lucide-react";
import ParticleNetwork from "@/components/ParticleNetwork";
import CrackedShield from "@/components/CrackedShield";

const WHATSAPP_NUMBER = "6285849551896";

interface Props {
  username: string;
  banReason: string;
  appealStatus: "none" | "pending" | "rejected";
  appealText: string;
  signOutAction: () => Promise<void>;
}

export default function BannedClient({
  username,
  banReason,
  appealStatus,
  appealText,
  signOutAction,
}: Props) {
  const [status, setStatus] = useState(appealStatus);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmitAppeal(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim banding.");
        return;
      }
      setStatus("pending");
    } finally {
      setSubmitting(false);
    }
  }

  function contactAdmin() {
    const msg = `Halo admin FrameX, saya @${username}. Akun saya di-ban dengan alasan: "${banReason}". Saya ingin menanyakan lebih lanjut soal ini.`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center px-4 py-12">
      {/* Jaring partikel interaktif - beberapa titik terdekat nempel ke kursor */}
      <ParticleNetwork />

      <div className="absolute inset-0 pointer-events-none">
        {/* Glow merah berdenyut */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.07, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/[0.13] rounded-full blur-3xl"
        />

        {/* Scanline statis - bikin kesan layar sistem terkunci */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)",
          }}
        />

        {/* Scanline yang menyapu turun pelan */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ top: ["-120px", "100%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[120px]"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(220,38,38,0.06), transparent)",
            }}
          />
        </div>

        {/* Tick merah di atas */}
        <div
          className="absolute inset-x-0 top-0 h-1.5 opacity-45"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(220,38,38,0.8) 0px, rgba(220,38,38,0.8) 1px, transparent 1px, transparent 12px)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-900/[0.82] backdrop-blur-xl p-7 @lg:p-8 shadow-[0_0_80px_-20px_rgba(220,38,38,0.4)]"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 mx-auto mb-5 text-red-400"
        >
          <CrackedShield size={26} />
        </motion.div>

        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-center mb-1.5">
          Akun Di-<span className="text-red-400">Ban</span>
        </h1>
        <p className="text-sm text-zinc-500 text-center mb-6">@{username}</p>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3.5 mb-5">
          <p className="text-[11px] uppercase tracking-wide text-red-400/80 mb-1">Alasan</p>
          <p className="text-sm text-zinc-200">{banReason}</p>
        </div>

        {status === "none" && (
          <form onSubmit={handleSubmitAppeal} className="flex flex-col gap-3 mb-5">
            <p className="text-xs text-zinc-500">
              Merasa ini keliru? Ajukan banding di bawah. Maksimal 1 kali pengajuan per 24 jam.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Jelaskan kenapa menurut kamu ban ini keliru..."
              rows={4}
              maxLength={500}
              className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60 resize-none"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting || !text.trim()}
              className="flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-50"
            >
              <Send size={15} />
              {submitting ? "Mengirim..." : "Ajukan Banding"}
            </motion.button>
          </form>
        )}

        {status === "pending" && (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3.5 mb-5">
            <Clock size={18} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm text-yellow-100 font-medium">Banding sedang ditinjau</p>
              <p className="text-xs text-zinc-500 mt-0.5">Tim admin akan meninjau pengajuan kamu.</p>
            </div>
          </div>
        )}

        {status === "rejected" && (
          <motion.div
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{
              opacity: 1,
              scale: [1.15, 0.97, 1],
              x: [0, 0, -4, 3, 0],
            }}
            transition={{ duration: 0.7, ease: [0.36, 0.07, 0.19, 0.97], times: [0, 0.6, 0.75, 0.85, 1] }}
            className="rounded-xl border border-red-500/35 bg-red-500/[0.06] px-4 py-3.5 mb-5"
          >
            <p className="banned-glitch flex items-center gap-2 text-sm font-extrabold text-red-500 tracking-wide">
              <XCircle size={16} />
              AJU BANDING DITOLAK
            </p>
            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
              Pengajuan banding kamu sudah ditinjau dan ditolak. Kamu gak bisa mengajukan banding lagi
              untuk kasus ini.
            </p>
          </motion.div>
        )}

        <button
          onClick={contactAdmin}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.3-.6-.4z" />
            <path d="M12 2a10 10 0 00-8.6 15L2 22l5.1-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2z" />
          </svg>
          Hubungi Admin via WhatsApp
        </button>

        <form action={signOutAction} className="mt-6 pt-5 border-t border-zinc-800 flex justify-center">
          <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition">
            <LogOut size={13} />
            Keluar dari akun
          </button>
        </form>
      </motion.div>
    </main>
  );
}
