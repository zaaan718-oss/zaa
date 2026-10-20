"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UploadCloud, Loader2, Download, FileVideo, X, Gauge } from "lucide-react";

const PLAN_LIMITS_MB: Record<string, number> = { free: 100, pro: 200, max: 500 };
const FPS_QUOTA: Record<string, number> = { free: 3, pro: 20, max: Infinity };
const MAX_DURATION_SECONDS = 20;

type Status = "idle" | "processing" | "done" | "error";

export default function OptimizePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const [usage, setUsage] = useState<number>(0);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setPlan(data.user.plan);
          setUsage(data.user.fpsUsage ?? 0);
        }
      });
  }, []);

  const maxMb = PLAN_LIMITS_MB[plan] ?? 100;
  const maxBytes = maxMb * 1024 * 1024;
  const quota = FPS_QUOTA[plan] ?? 3;
  const quotaLeft = quota === Infinity ? Infinity : Math.max(quota - usage, 0);
  const quotaExhausted = quotaLeft <= 0;

  useEffect(() => {
    if (status !== "processing") return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  function pickFile(f: File | null) {
    setError(null);
    setResultUrl(null);
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("File harus berupa video.");
      return;
    }
    if (f.size > maxBytes) {
      setError(
        `Ukuran maksimal ${maxMb}MB untuk paket ${plan}. File kamu ${(f.size / 1024 / 1024).toFixed(1)}MB.`
      );
      return;
    }
    setFile(f);
  }

  async function handleProcess() {
    if (!file) return;
    setStatus("processing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const res = await fetch("/api/optimize", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal memproses video.");
        setStatus("error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setUsage((u) => u + 1);
      setStatus("done");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setStatus("error");
    }
  }

  function reset() {
    setFile(null);
    setResultUrl(null);
    setStatus("idle");
    setError(null);
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

        <div className="flex items-start justify-between gap-4 mb-2">
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-400/80 font-[family-name:var(--font-mono)]">
            Alat
          </p>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500 font-[family-name:var(--font-mono)] shrink-0">
            <Gauge size={12} />
            {quota === Infinity ? `${usage} dipakai` : `${quotaLeft}/${quota} tersisa`}
          </span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl @lg:text-3xl font-bold mb-2">
          Optimasi Video · 120 FPS
        </h1>
        <p className="text-zinc-400 mb-8">
          Naikkan frame rate video ke 120 FPS lewat interpolasi frame bermotion-compensation.
          Maksimal ukuran file {maxMb}MB dan durasi {MAX_DURATION_SECONDS} detik untuk paket{" "}
          <span className="text-yellow-400">{plan}</span>.
        </p>

        {quotaExhausted && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-400/5 px-4 py-3 text-sm text-yellow-400 mb-6">
            Kuota fitur ini untuk paket {plan} sudah habis. Upgrade paket buat kuota lebih banyak.
          </div>
        )}

        {!file && !quotaExhausted && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center cursor-pointer transition ${
              dragOver
                ? "border-yellow-400 bg-yellow-400/5"
                : "border-zinc-700 hover:border-yellow-500/40"
            }`}
          >
            <UploadCloud size={28} className="text-yellow-400" />
            <p className="text-sm text-zinc-300">
              Seret video ke sini, atau <span className="text-yellow-400">klik untuk pilih file</span>
            </p>
            <p className="text-xs text-zinc-600">
              MP4, MOV, WebM · maks. {maxMb}MB · maks. {MAX_DURATION_SECONDS} detik
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-red-400 mt-4"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {file && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-yellow-500/20 bg-zinc-900/60 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-400">
                  <FileVideo size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
              {status === "idle" && (
                <button onClick={reset} className="text-zinc-500 hover:text-white transition shrink-0">
                  <X size={18} />
                </button>
              )}
            </div>

            {status === "idle" && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleProcess}
                className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300"
              >
                Proses ke 120 FPS
              </motion.button>
            )}

            {status === "processing" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 size={24} className="animate-spin text-yellow-400" />
                <p className="text-sm text-zinc-300">Memproses video... {elapsed}s</p>
                <p className="text-xs text-zinc-600 text-center max-w-xs">
                  Interpolasi frame cukup berat secara komputasi — biasanya butuh puluhan detik
                  hingga beberapa menit.
                </p>
              </div>
            )}

            {status === "done" && resultUrl && (
              <div className="flex flex-col gap-4">
                <video src={resultUrl} controls className="w-full rounded-xl bg-black" />
                <div className="flex gap-3">
                  <a
                    href={resultUrl}
                    download="framex-120fps.mp4"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-yellow-300"
                  >
                    <Download size={16} />
                    Unduh Hasil
                  </a>
                  <button
                    onClick={reset}
                    className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-yellow-500/40"
                  >
                    Proses Lagi
                  </button>
                </div>
              </div>
            )}

            {status === "error" && (
              <button
                onClick={reset}
                className="w-full rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-yellow-500/40"
              >
                Coba Lagi
              </button>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
