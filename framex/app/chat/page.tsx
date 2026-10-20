"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Image as ImageIcon, Send, X, Trash2, Flag, Ban } from "lucide-react";
import RoleBadge from "@/components/RoleBadge";

interface ChatMessage {
  id: string;
  authorId: string;
  username: string;
  avatar: string;
  role: "user" | "developer" | "admin";
  plan: "free" | "pro" | "max";
  text: string;
  imageUrl?: string;
  createdAt: number;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const POLL_MS = 4000;
const TYPING_POLL_MS = 1200;
const LONG_PRESS_MS = 500;
const TYPING_THROTTLE_MS = 2000;

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j`;
  return `${Math.floor(hr / 24)}h`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string>("");
  const [myRole, setMyRole] = useState<"user" | "developer" | "admin">("user");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingPing = useRef(0);

  const isModerator = myRole === "admin" || myRole === "developer";

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch {
      // polling gagal sesekali gak masalah, coba lagi di interval berikutnya
    }
  }, []);

  const fetchTyping = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/typing");
      const data = await res.json();
      setTypingUsers(data.typingUsernames ?? []);
    } catch {
      // gagal sesekali gak masalah
    }
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setMyId(data.user.id);
          setMyRole(data.user.role ?? "user");
        }
      });
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Polling typing TERPISAH dan LEBIH CEPAT dari daftar pesan - sebelumnya
  // numpang di polling pesan yang tiap 4 detik sementara ping typing cuma
  // "hidup" 3 detik, jadi kadang kelewat. Sekarang dicek independen tiap
  // 1.2 detik.
  useEffect(() => {
    fetchTyping();
    const interval = setInterval(fetchTyping, TYPING_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchTyping]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function pickImage(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Ukuran foto maksimal 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleTextChange(value: string) {
    setText(value);
    const now = Date.now();
    if (now - lastTypingPing.current > TYPING_THROTTLE_MS) {
      lastTypingPing.current = now;
      fetch("/api/chat/typing", { method: "POST" }).catch(() => {});
    }
  }

  async function handleSend() {
    if (!text.trim() && !imageData) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), image: imageData || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim pesan.");
        return;
      }
      setText("");
      setImageData(null);
      setImagePreview(null);
      fetchMessages();
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    setMenuFor(null);
    await fetch(`/api/chat/${id}`, { method: "DELETE" });
    fetchMessages();
  }

  function openReportModal(id: string) {
    setMenuFor(null);
    setReportTarget(id);
    setReportReason("");
  }

  async function submitReport() {
    if (!reportTarget || !reportReason.trim()) return;
    await fetch(`/api/chat/${reportTarget}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason.trim() }),
    });
    setReportTarget(null);
    setReportReason("");
  }

  async function handleBan(id: string) {
    setMenuFor(null);
    await fetch(`/api/chat/${id}/ban-author`, { method: "POST" });
    fetchMessages();
  }

  function startLongPress(id: string) {
    longPressTimer.current = setTimeout(() => setMenuFor(id), LONG_PRESS_MS);
  }
  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  return (
    <main className="min-h-screen text-white flex flex-col h-screen">
      <header className="flex items-center gap-3 px-6 @lg:px-10 py-4 border-b border-yellow-500/10 shrink-0">
        <Link href="/" className="text-zinc-500 hover:text-yellow-400 transition">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-lg font-bold">
          Chat <span className="text-yellow-400">Global</span>
        </h1>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 @lg:px-10 py-6 flex flex-col gap-4">
        {messages.map((m) => {
          const isMine = m.authorId === myId;
          return (
            <div key={m.id} className="relative flex gap-2.5">
              <Link href={`/u/${m.username}`} className="shrink-0">
                {m.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar} alt="" className="h-8 w-8 rounded-full object-cover mt-0.5" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-zinc-800 mt-0.5" />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <Link href={`/u/${m.username}`} className="text-sm font-medium hover:text-yellow-400 transition">
                    {m.username}
                  </Link>
                  <RoleBadge role={m.role} plan={m.plan} />
                  <span className="text-[10px] text-zinc-600">{timeAgo(m.createdAt)}</span>
                </div>

                <div
                  onMouseDown={() => startLongPress(m.id)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(m.id)}
                  onTouchEnd={cancelLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuFor(m.id);
                  }}
                  className="inline-block max-w-[85%] select-none cursor-pointer"
                >
                  {m.text && (
                    <p className="text-sm text-zinc-200 bg-zinc-900/60 border border-zinc-800 rounded-xl rounded-tl-sm px-3.5 py-2.5 whitespace-pre-wrap break-words">
                      {m.text}
                    </p>
                  )}
                  {m.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt=""
                      className={`rounded-xl max-h-64 object-cover ${m.text ? "mt-1.5" : ""}`}
                    />
                  )}
                </div>

                <AnimatePresence>
                  {menuFor === m.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-1.5 inline-flex gap-1.5 rounded-lg border border-yellow-500/20 bg-zinc-900 p-1.5"
                    >
                      {(isMine || (isModerator && m.role === "user")) && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 size={12} />
                          Hapus
                        </button>
                      )}
                      {!isMine && !isModerator && (
                        <button
                          onClick={() => openReportModal(m.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/10 transition"
                        >
                          <Flag size={12} />
                          Laporkan
                        </button>
                      )}
                      {!isMine && isModerator && m.role === "user" && (
                        <button
                          onClick={() => handleBan(m.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Ban size={12} />
                          Ban
                        </button>
                      )}
                      <button
                        onClick={() => setMenuFor(null)}
                        className="flex items-center rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 transition"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-zinc-500 pl-11"
            >
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-bounce" />
              </span>
              {typingUsers.join(", ")} sedang mengetik...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-yellow-500/10 px-4 @lg:px-10 py-4 shrink-0">
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        {imagePreview && (
          <div className="relative inline-block mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="" className="h-16 rounded-lg" />
            <button
              onClick={() => {
                setImageData(null);
                setImagePreview(null);
              }}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-black border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X size={11} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 hover:border-yellow-400/60 hover:text-yellow-400 transition"
          >
            <ImageIcon size={17} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
          />
          <input
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Tulis pesan..."
            maxLength={500}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm outline-none focus:border-yellow-400/60"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={sending || (!text.trim() && !imageData)}
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-yellow-400 text-black hover:bg-yellow-300 transition disabled:opacity-50"
          >
            <Send size={16} />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {reportTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setReportTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-yellow-500/20 bg-zinc-900/95 p-6"
            >
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold mb-1">
                Laporkan Pesan
              </h2>
              <p className="text-xs text-zinc-500 mb-4">Kasih tau alasannya biar admin bisa tinjau.</p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Alasan laporan..."
                rows={3}
                maxLength={300}
                autoFocus
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60 resize-none mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitReport}
                  disabled={!reportReason.trim()}
                  className="flex-1 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-50"
                >
                  Kirim Laporan
                </button>
                <button
                  onClick={() => setReportTarget(null)}
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
