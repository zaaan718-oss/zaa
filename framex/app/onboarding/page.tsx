"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, Loader2 } from "lucide-react";

const MAX_AVATAR_BYTES = 20 * 1024 * 1024; // 20MB

export default function OnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUsername(data.user.username ?? "");
          setAvatarPreview(data.user.avatar || null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleAvatarPick(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File foto harus berupa gambar.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Ukuran foto maksimal 20MB.");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          bio: bio || undefined,
          avatar: avatarData || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen text-white flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm rounded-2xl border border-yellow-500/20 bg-zinc-900/80 p-7"
      >
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold mb-1">
          Lengkapi Profil
        </h1>
        <p className="text-sm text-zinc-500 mb-6">
          Sebelum mulai, atur username kamu. Foto & bio bersifat opsional.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm py-8 justify-center">
            <Loader2 size={16} className="animate-spin" />
            Memuat...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative h-20 w-20 rounded-full border-2 border-dashed border-zinc-700 hover:border-yellow-400/60 transition overflow-hidden flex items-center justify-center bg-black/40"
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera size={20} className="text-zinc-600" />
                )}
                <span className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center text-[10px]">
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

            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Bio (opsional)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={2}
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-400/60 resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Mulai Pakai FrameX"}
            </motion.button>
          </form>
        )}
      </motion.div>
    </main>
  );
}
