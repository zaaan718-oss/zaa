"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, Loader2, Camera, Settings } from "lucide-react";

const MAX_AVATAR_BYTES = 20 * 1024 * 1024; // 20MB

interface Profile {
  id: string;
  username: string;
  bio: string;
  email: string;
  avatar: string;
  plan: "free" | "pro" | "max";
  role: "user" | "developer" | "admin";
  createdAt: number;
}

export default function ProfilePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setLoadError(data.error || "Gagal memuat profil.");
          return;
        }
        if (data.user) {
          setProfile(data.user);
          setUsername(data.user.username);
          setBio(data.user.bio ?? "");
          setAvatarPreview(data.user.avatar || null);
        }
      })
      .catch(() => setLoadError("Gagal terhubung ke server."));
  }, []);

  function handleAvatarPick(file: File | null) {
    setMessage(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "err", text: "File foto harus berupa gambar." });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setMessage({ type: "err", text: "Ukuran foto maksimal 20MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      setAvatarData(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, bio, avatar: avatarData || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error });
        return;
      }
      setProfile(data.user);
      setAvatarPreview(data.user.avatar || null);
      setAvatarData(null);
      setMessage({ type: "ok", text: "Perubahan tersimpan." });
    } finally {
      setSaving(false);
    }
  }

  function copyId() {
    if (!profile) return;
    navigator.clipboard.writeText(profile.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="min-h-screen text-white px-6 @lg:px-10 py-10">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-yellow-400 transition"
          >
            <ArrowLeft size={15} />
            Kembali
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-yellow-400 transition"
          >
            <Settings size={15} />
            Pengaturan
          </Link>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-yellow-400/80 font-[family-name:var(--font-mono)] mb-2">
          Akun
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl @lg:text-3xl font-bold mb-8">
          Profil
        </h1>

        {loadError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
            {loadError}
          </div>
        ) : !profile ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Memuat...
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative h-20 w-20 rounded-full border-2 border-dashed border-zinc-700 hover:border-yellow-400/60 transition overflow-hidden flex items-center justify-center bg-black/40 group"
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera size={20} className="text-zinc-600" />
                )}
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px]">
                  Ganti
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarPick(e.target.files?.[0] ?? null)}
              />
            </div>
            {avatarData && (
              <p className="text-center text-xs text-yellow-400 mb-5 -mt-2">
                Foto baru dipilih — klik &quot;Simpan Perubahan&quot; di bawah untuk menyimpannya.
              </p>
            )}

            <div className="rounded-2xl border border-yellow-500/20 bg-zinc-900/60 p-5 mb-5">
              <p className="text-xs text-zinc-500 mb-1.5">ID Akun</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-[family-name:var(--font-mono)] text-zinc-300 truncate">
                  {profile.id}
                </code>
                <button
                  onClick={copyId}
                  className="shrink-0 text-zinc-500 hover:text-yellow-400 transition"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-4 text-xs text-zinc-500">
                <span>
                  Plan:{" "}
                  <span className="uppercase tracking-wide text-yellow-400 font-medium">
                    {profile.plan}
                  </span>
                </span>
                {profile.role !== "user" && (
                  <span>
                    Role:{" "}
                    <span
                      className={`uppercase tracking-wide font-medium ${
                        profile.role === "admin" ? "text-yellow-400" : "text-emerald-400"
                      }`}
                    >
                      {profile.role}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="rounded-2xl border border-yellow-500/20 bg-zinc-900/60 p-5 flex flex-col gap-4"
            >
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60 resize-none"
                />
                <p className="text-[11px] text-zinc-600 mt-1 text-right">{bio.length}/160</p>
              </div>

              {message && (
                <p className={`text-xs ${message.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                  {message.text}
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={saving}
                className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </motion.button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
