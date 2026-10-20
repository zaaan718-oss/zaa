"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Image as ImageIcon, Send, X, Pencil, Trash2, Flag, ShieldCheck, Clock, Check, Ban, Phone } from "lucide-react";
import { useCall } from "@/components/CallProvider";

interface DmMessage {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  createdAt: number;
  editedAt?: number;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const POLL_MS = 4000;
const TYPING_POLL_MS = 1200;
const TYPING_THROTTLE_MS = 2000;
const EDIT_WINDOW_MS = 5 * 60 * 1000;
const LONG_PRESS_MS = 500;

export default function DmThreadPage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { startCall } = useCall();

  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [other, setOther] = useState<{
    username: string;
    name: string;
    avatar: string;
    requirePermissionForDm: boolean;
  } | null>(null);
  const [myId, setMyId] = useState("");
  const [myPermission, setMyPermission] = useState<"approved" | "none" | "pending" | "declined">(
    "approved"
  );
  const [incomingRequest, setIncomingRequest] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [text, setText] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<"spam" | "other">("spam");
  const [reportReason, setReportReason] = useState("");
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingPing = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/dm/${username}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memuat percakapan.");
        return;
      }
      setMessages(data.messages ?? []);
      setOther(data.other ?? null);
      setMyPermission(data.myPermission ?? "approved");
      setIncomingRequest(!!data.incomingRequest);
    } catch {
      // gagal sesekali gak masalah, coba lagi interval berikutnya
    }
  }, [username]);

  const fetchTyping = useCallback(async () => {
    try {
      const res = await fetch(`/api/dm/${username}/typing`);
      const data = await res.json();
      setOtherTyping(!!data.typing);
    } catch {
      // gagal sesekali gak masalah
    }
  }, [username]);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setMyId(data.user.id);
      });
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Polling typing TERPISAH dan LEBIH CEPAT dari daftar pesan - sebelumnya
  // status typing numpang di polling pesan yang tiap 4 detik, sementara ping
  // typing cuma "hidup" 3 detik, jadi kadang kelewat / gak sempat kedeteksi
  // pas pollingnya jatuh. Sekarang dicek independen tiap 1.2 detik.
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
      fetch(`/api/dm/${username}/typing`, { method: "POST" }).catch(() => {});
    }
  }

  async function handleSend() {
    if (!text.trim() && !imageData) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/dm/${username}`, {
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

  async function handleRequestPermission() {
    setPermissionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dm/${username}/permission`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim permintaan izin.");
        return;
      }
      setMyPermission(data.status);
    } finally {
      setPermissionBusy(false);
    }
  }

  async function handleResolvePermission(action: "approve" | "decline") {
    setPermissionBusy(true);
    try {
      await fetch(`/api/dm/${username}/permission`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setIncomingRequest(false);
      fetchMessages();
    } finally {
      setPermissionBusy(false);
    }
  }

  function startLongPress(id: string) {
    longPressTimer.current = setTimeout(() => setMenuFor(id), LONG_PRESS_MS);
  }
  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function startEdit(m: DmMessage) {
    setMenuFor(null);
    setEditingId(m.id);
    setEditText(m.text);
  }

  async function submitEdit() {
    if (!editingId || !editText.trim()) return;
    const res = await fetch(`/api/dm/${username}/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal mengedit pesan.");
    } else {
      setEditingId(null);
      fetchMessages();
    }
  }

  async function handleDelete(id: string) {
    setMenuFor(null);
    await fetch(`/api/dm/${username}/${id}`, { method: "DELETE" });
    fetchMessages();
  }

  async function submitReport() {
    if (!reportReason.trim()) return;
    const res = await fetch(`/api/users/${username}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason.trim(), category: reportCategory }),
    });
    const data = await res.json();
    setReportOpen(false);
    setReportReason("");
    setReportMsg(res.ok ? "Laporan terkirim ke admin." : data.error || "Gagal mengirim laporan.");
  }

  return (
    <main className="min-h-screen text-white flex flex-col h-screen">
      <header className="flex items-center gap-3 px-6 @lg:px-10 py-4 border-b border-yellow-500/10 shrink-0">
        <Link href="/dm" className="text-zinc-500 hover:text-yellow-400 transition">
          <ArrowLeft size={18} />
        </Link>
        <button
          onClick={() =>
            other &&
            startCall({ username: other.username, name: other.name || username, avatar: other.avatar })
          }
          disabled={!other}
          className="text-zinc-500 hover:text-yellow-400 transition disabled:opacity-30"
          aria-label="Telepon"
        >
          <Phone size={18} />
        </button>
        <Link href={`/u/${username}`} className="flex items-center gap-2.5 flex-1 min-w-0">
          {other?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-800" />
          )}
          <span className="font-medium hover:text-yellow-400 transition truncate">
            {other?.name ?? username}
          </span>
        </Link>
        <button
          onClick={() => setReportOpen(true)}
          className="shrink-0 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition"
        >
          <Flag size={13} />
          <span className="hidden @lg:inline">Laporkan Akun</span>
        </button>
      </header>

      {reportMsg && (
        <p className="text-center text-xs text-yellow-400 bg-yellow-400/5 border-b border-yellow-500/10 py-2">
          {reportMsg}
        </p>
      )}

      {incomingRequest && (
        <div className="flex items-center justify-between gap-3 px-4 @lg:px-10 py-3 border-b border-yellow-500/10 bg-yellow-400/5">
          <p className="text-xs text-zinc-300 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-yellow-400 shrink-0" />
            @{username} minta izin buat chat pribadi sama kamu.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={permissionBusy}
              onClick={() => handleResolvePermission("approve")}
              className="flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-50"
            >
              <Check size={12} />
              Izinkan
            </button>
            <button
              disabled={permissionBusy}
              onClick={() => handleResolvePermission("decline")}
              className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-500/40 hover:text-red-400 transition disabled:opacity-50"
            >
              <Ban size={12} />
              Tolak
            </button>
          </div>
        </div>
      )}

      {other?.requirePermissionForDm && myPermission !== "approved" && (
        <div className="flex flex-col items-center text-center gap-2 px-6 py-5 border-b border-yellow-500/10 bg-zinc-900/40">
          {myPermission === "pending" ? (
            <>
              <Clock size={18} className="text-yellow-400" />
              <p className="text-xs text-zinc-400">
                Permintaan izin kamu ke @{username} masih menunggu persetujuan.
              </p>
            </>
          ) : myPermission === "declined" ? (
            <>
              <Ban size={18} className="text-red-400" />
              <p className="text-xs text-zinc-400">
                @{username} menolak permintaan izin chat kamu.
              </p>
            </>
          ) : (
            <>
              <ShieldCheck size={18} className="text-yellow-400" />
              <p className="text-xs text-zinc-400">
                @{username} mengaktifkan fitur tunggu izin sebelum chat pribadi.
              </p>
              <button
                onClick={handleRequestPermission}
                disabled={permissionBusy}
                className="rounded-lg bg-yellow-400 px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-50"
              >
                Minta Izin Mengobrol
              </button>
            </>
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 @lg:px-10 py-6 flex flex-col gap-3">
        {messages.map((m) => {
          const isMine = m.senderId === myId;
          const canEdit = isMine && Date.now() - m.createdAt < EDIT_WINDOW_MS;
          return (
            <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <div
                onMouseDown={() => isMine && startLongPress(m.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => isMine && startLongPress(m.id)}
                onTouchEnd={cancelLongPress}
                onContextMenu={(e) => {
                  if (!isMine) return;
                  e.preventDefault();
                  setMenuFor(m.id);
                }}
                className={`max-w-[75%] ${isMine ? "cursor-pointer select-none" : ""}`}
              >
                {m.text && (
                  <p
                    className={`text-sm whitespace-pre-wrap break-words rounded-xl px-3.5 py-2.5 ${
                      isMine
                        ? "bg-yellow-400 text-black rounded-tr-sm"
                        : "bg-zinc-900/60 border border-zinc-800 text-zinc-200 rounded-tl-sm"
                    }`}
                  >
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
                {m.editedAt && (
                  <p className={`text-[10px] text-zinc-600 mt-0.5 ${isMine ? "text-right" : ""}`}>
                    pesan ini diedit
                  </p>
                )}
              </div>

              <AnimatePresence>
                {menuFor === m.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-1 inline-flex gap-1.5 rounded-lg border border-yellow-500/20 bg-zinc-900 p-1.5"
                  >
                    {canEdit && (
                      <button
                        onClick={() => startEdit(m)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/10 transition"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 size={12} />
                      Hapus
                    </button>
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
          );
        })}

        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-600 mt-10">Belum ada pesan. Mulai ngobrol!</p>
        )}

        <AnimatePresence>
          {otherTyping && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-zinc-500"
            >
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-bounce" />
              </span>
              sedang mengetik...
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
        {(() => {
          const blocked = !!other?.requirePermissionForDm && myPermission !== "approved";
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={blocked}
                className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 hover:border-yellow-400/60 hover:text-yellow-400 transition disabled:opacity-40 disabled:pointer-events-none"
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
                placeholder={blocked ? "Minta izin dulu buat kirim pesan..." : "Tulis pesan..."}
                maxLength={500}
                disabled={blocked}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm outline-none focus:border-yellow-400/60 disabled:opacity-40"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={blocked || sending || (!text.trim() && !imageData)}
                className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-yellow-400 text-black hover:bg-yellow-300 transition disabled:opacity-50"
              >
                <Send size={16} />
              </motion.button>
            </div>
          );
        })()}
      </div>

      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setEditingId(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-yellow-500/20 bg-zinc-900/95 p-6"
            >
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold mb-4">Edit Pesan</h2>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                maxLength={500}
                autoFocus
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60 resize-none mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitEdit}
                  disabled={!editText.trim()}
                  className="flex-1 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-50"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-500 transition"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="flex items-center justify-between mb-4">
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
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={
                  reportCategory === "spam"
                    ? "Jelaskan spam-nya (opsional, 5 pesan terakhir otomatis disertakan)..."
                    : "Jelaskan alasan laporan kamu..."
                }
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
