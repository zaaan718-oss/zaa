"use client";

import { motion } from "framer-motion";

export default function LoginCard({ signInAction }: { signInAction: () => Promise<void> }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-400/10 rounded-full blur-3xl" />
      <div
        className="absolute inset-x-0 top-0 h-2 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(234,179,8,0.6) 0px, rgba(234,179,8,0.6) 1px, transparent 1px, transparent 12px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-yellow-500/20 bg-zinc-900/80 backdrop-blur-xl p-8 shadow-[0_0_60px_-15px_rgba(234,179,8,0.3)]"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            <span className="text-yellow-400">Frame</span>
            <span className="text-white">X</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Masuk untuk mengakses optimasi video dan alat TikTok
          </p>
        </div>

        <form action={signInAction}>
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-yellow-400 px-4 py-3 font-semibold text-black transition hover:bg-yellow-300"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.7 13.4-4.7l-6.2-5.2C29.2 35.8 26.7 36.7 24 36.7c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.4 39.6 16.1 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2C40.9 36 44 31 44 24c0-1.4-.1-2.4-.4-3.5z" />
            </svg>
            Lanjutkan dengan Google
          </motion.button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Dengan masuk, kamu setuju video yang diunggah maksimal 20MB.
        </p>
      </motion.div>
    </main>
  );
}
