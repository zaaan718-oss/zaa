"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Music2, Sparkles, MessageCircle, MessageSquare, ArrowUpRight, LogOut, User, Users, Radio, Crown, CheckCircle2, Megaphone, X, Settings } from "lucide-react";
import CountUp from "@/components/CountUp";
import UpgradeModal from "@/components/UpgradeModal";

const DISMISSED_KEY = "framex-announcement-dismissed";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

interface DashboardClientProps {
  firstName: string;
  email: string;
  username: string;
  plan: "free" | "pro" | "max";
  role: "user" | "developer" | "admin";
  signOutAction: () => Promise<void>;
}

const tools = [
  {
    href: "/optimize",
    icon: Zap,
    title: "Optimasi Video",
    desc: "Naikkan frame rate video ke 120 FPS lewat interpolasi frame.",
    tag: "120 FPS",
  },
  {
    href: "/upscale",
    icon: Sparkles,
    title: "Upgrade Kualitas",
    desc: "Tingkatkan resolusi video ke Full HD 1080p.",
    tag: "1080p",
  },
  {
    href: "/tiktok",
    icon: Music2,
    title: "Cek Video TikTok",
    desc: "Tempel tautan, putar tanpa watermark, dan lihat statistik lengkapnya.",
    tag: "No watermark",
  },
  {
    href: "/chat",
    icon: MessageCircle,
    title: "Chat Global",
    desc: "Ngobrol bareng semua pengguna FrameX, bisa kirim foto juga.",
    tag: "Live",
  },
];

export default function DashboardClient({
  firstName,
  email,
  username,
  plan,
  role,
  signOutAction,
}: DashboardClientProps) {
  const [stats, setStats] = useState<{ totalUsers: number; onlineUsers: number } | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{ id: string; text: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.totalUsers !== undefined) setStats(data);
      });

    fetch("/api/announcement")
      .then((r) => r.json())
      .then((data) => {
        if (data.announcement?.id) {
          const dismissed = window.localStorage.getItem(DISMISSED_KEY);
          if (dismissed !== data.announcement.id) {
            setAnnouncement(data.announcement);
          }
        }
      });
  }, []);

  useEffect(() => {
    function loadUnread() {
      fetch("/api/dm/unread-count")
        .then((r) => r.json())
        .then((data) => setUnreadCount(data.total ?? 0))
        .catch(() => {});
    }
    loadUnread();
    const interval = setInterval(loadUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  function dismissAnnouncement() {
    if (announcement) window.localStorage.setItem(DISMISSED_KEY, announcement.id);
    setAnnouncement(null);
  }

  return (
    <main className="min-h-screen text-white">
      <header className="flex items-center justify-between px-6 @lg:px-10 py-5 border-b border-yellow-500/10">
        <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
          <span className="text-yellow-400">Frame</span>X
        </span>
        <div className="flex items-center gap-2 @lg:gap-4">
          <span className="text-sm text-zinc-500 hidden @lg:inline font-[family-name:var(--font-mono)]">
            {email}
          </span>

          {plan === "free" && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setUpgradeOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-yellow-400 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-yellow-300 transition"
            >
              <Crown size={13} />
              Upgrade
            </motion.button>
          )}

          <Link
            href="/dm"
            className="relative flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 hover:border-yellow-400/60 hover:text-yellow-400 transition"
            aria-label="Pesan Pribadi"
          >
            <MessageSquare size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-semibold text-black">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 hover:border-yellow-400/60 hover:text-yellow-400 transition"
            aria-label="Profil"
          >
            <User size={15} />
          </Link>

          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 hover:border-yellow-400/60 hover:text-yellow-400 transition"
            aria-label="Pengaturan"
          >
            <Settings size={15} />
          </Link>

          <form action={signOutAction}>
            <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-yellow-400 transition">
              <LogOut size={14} />
              <span className="hidden @lg:inline">Keluar</span>
            </button>
          </form>
        </div>
      </header>

      <div
        className="h-2 w-full opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(234,179,8,0.5) 0px, rgba(234,179,8,0.5) 1px, transparent 1px, transparent 12px)",
        }}
      />

      <AnimatePresence>
        {announcement && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 bg-yellow-400/10 border-b border-yellow-500/20 px-6 @lg:px-10 py-3">
              <Megaphone size={15} className="text-yellow-400 shrink-0" />
              <p className="flex-1 text-sm text-yellow-100">{announcement.text}</p>
              <button
                onClick={dismissAnnouncement}
                className="text-yellow-400/70 hover:text-yellow-400 transition shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.section
        initial="hidden"
        animate="show"
        variants={container}
        className="px-6 @lg:px-10 py-16 @lg:py-20 max-w-5xl mx-auto"
      >
        <motion.p
          variants={item}
          className="text-xs uppercase tracking-[0.2em] text-yellow-400/80 font-[family-name:var(--font-mono)] mb-3"
        >
          Beranda
        </motion.p>
        {role !== "user" && (
          <motion.div
            variants={item}
            className={`flex items-center gap-1.5 text-xs font-medium mb-1.5 ${
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
          </motion.div>
        )}
        <motion.h1
          variants={item}
          className="font-[family-name:var(--font-display)] text-3xl @lg:text-4xl font-bold mb-2 flex items-center gap-3 flex-wrap"
        >
          Halo, {firstName}
          <span className="text-xs font-normal font-[family-name:var(--font-mono)] uppercase tracking-wide text-zinc-500 border border-zinc-700 rounded-full px-2.5 py-1">
            {plan}
          </span>
        </motion.h1>
        <motion.p variants={item} className="text-zinc-400 mb-8">
          @{username} · Pilih alat yang mau kamu pakai.
        </motion.p>

        <motion.div variants={item} className="grid grid-cols-2 gap-4 mb-12 max-w-sm">
          <div className="rounded-xl border border-yellow-500/20 bg-zinc-900/60 px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1.5">
              <Users size={12} />
              Total User
            </div>
            <p className="text-xl font-semibold font-[family-name:var(--font-mono)]">
              {stats ? <CountUp value={stats.totalUsers} /> : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-zinc-900/60 px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1.5">
              <Radio size={12} className="text-emerald-400" />
              Online
            </div>
            <p className="text-xl font-semibold font-[family-name:var(--font-mono)]">
              {stats ? <CountUp value={stats.onlineUsers} /> : "—"}
            </p>
          </div>
        </motion.div>

        <div className="grid @lg:grid-cols-2 gap-5">
          {tools.map((tool) => (
            <motion.div key={tool.href} variants={item}>
              <Link href={tool.href} className="group block h-full">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative h-full rounded-2xl border border-yellow-500/20 bg-zinc-900/60 p-6 @lg:p-7 overflow-hidden transition-colors group-hover:border-yellow-400/60"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 via-yellow-400/0 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-start justify-between mb-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-black">
                      <tool.icon size={20} />
                    </div>
                    <ArrowUpRight
                      size={18}
                      className="text-zinc-600 group-hover:text-yellow-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                    />
                  </div>
                  <h2 className="relative text-lg font-semibold mb-1.5 font-[family-name:var(--font-display)]">
                    {tool.title}
                  </h2>
                  <p className="relative text-sm text-zinc-400 leading-relaxed mb-4">{tool.desc}</p>
                  <span className="relative inline-block text-[11px] font-[family-name:var(--font-mono)] tracking-wide text-yellow-400/90 border border-yellow-400/20 rounded-full px-2.5 py-1">
                    {tool.tag}
                  </span>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} username={username} />
    </main>
  );
}
