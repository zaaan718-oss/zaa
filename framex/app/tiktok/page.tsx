"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Link2,
  Loader2,
  Download,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Gauge,
} from "lucide-react";
import CountUp from "@/components/CountUp";

interface TikTokResult {
  title: string;
  cover: string;
  previewUrl: string;
  downloadUrl: string;
  author: { name: string; username: string; avatar: string };
  stats: { views: number; likes: number; comments: number; shares: number };
  duration: number;
  fps: number | null;
}

export default function TikTokPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TikTokResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal memproses link.");
        return;
      }
      setResult(data);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-white px-6 @lg:px-10 py-10">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-yellow-400 transition mb-8"
        >
          <ArrowLeft size={15} />
          Kembali
        </Link>

        <p className="text-xs uppercase tracking-[0.2em] text-yellow-400/80 font-[family-name:var(--font-mono)] mb-2">
          Alat
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl @lg:text-3xl font-bold mb-2">
          Cek Video TikTok
        </h1>
        <p className="text-zinc-400 mb-8">
          Tempel tautan video TikTok, lalu lihat versi tanpa watermark beserta statistiknya.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col @lg:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Link2
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@akun/video/..."
              className="w-full rounded-xl border border-yellow-500/20 bg-zinc-900/60 pl-10 pr-4 py-3 text-sm outline-none transition focus:border-yellow-400/60 placeholder:text-zinc-600"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Memproses" : "Cek Video"}
          </motion.button>
        </form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-red-400 mb-6"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="rounded-2xl border border-yellow-500/20 bg-zinc-900/60 overflow-hidden"
            >
              <div className="grid @lg:grid-cols-[280px_1fr]">
                <div className="bg-black flex items-center justify-center">
                  <video
                    src={result.previewUrl}
                    poster={result.cover}
                    controls
                    className="w-full max-h-[420px] object-contain"
                  />
                </div>

                <div className="p-6 flex flex-col">
                  <div className="flex items-center gap-2.5 mb-3">
                    {result.author.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={result.author.avatar}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-zinc-700" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{result.author.name}</p>
                      <p className="text-xs text-zinc-500">@{result.author.username}</p>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed mb-5 line-clamp-3">
                    {result.title}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-5 font-[family-name:var(--font-mono)]">
                    <Stat icon={Eye} label="Views" value={result.stats.views} />
                    <Stat icon={Heart} label="Likes" value={result.stats.likes} />
                    <Stat icon={MessageCircle} label="Komentar" value={result.stats.comments} />
                    <Stat icon={Share2} label="Dibagikan" value={result.stats.shares} />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-yellow-400/90 mb-5">
                    <Gauge size={13} />
                    {result.fps ? `${result.fps} FPS asli` : "FPS tidak terdeteksi"}
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-500">{result.duration}s</span>
                  </div>

                  <a
                    href={result.downloadUrl}
                    className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-yellow-300"
                  >
                    <Download size={16} />
                    Unduh Tanpa Watermark
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1">
        <Icon size={12} />
        {label}
      </div>
      <p className="text-lg font-semibold text-white">
        <CountUp value={value} />
      </p>
    </div>
  );
}
