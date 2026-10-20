"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Network, ShieldCheck, Lock } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";

function Toggle({ on, onClick, busy }: { on: boolean; onClick: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={on}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
        on ? "bg-yellow-400" : "bg-zinc-700"
      }`}
    >
      <motion.span
        animate={{ x: on ? 26 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute left-0 top-1 h-4 w-4 rounded-full bg-black"
      />
    </button>
  );
}

export default function SettingsPage() {
  const { networkBackground, setNetworkBackground } = useSettings();

  const [loading, setLoading] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [requirePermissionForDm, setRequirePermissionForDm] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Gagal memuat pengaturan.");
          return;
        }
        setPrivateAccount(!!data.privateAccount);
        setRequirePermissionForDm(!!data.requirePermissionForDm);
      })
      .catch(() => setError("Gagal terhubung ke server."))
      .finally(() => setLoading(false));
  }, []);

  async function patchSettings(key: "privateAccount" | "requirePermissionForDm", value: boolean) {
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan pengaturan.");
        return;
      }
      if (key === "privateAccount") setPrivateAccount(!!data.privateAccount);
      if (key === "requirePermissionForDm") setRequirePermissionForDm(!!data.requirePermissionForDm);
    } finally {
      setBusyKey(null);
    }
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

        <p className="text-xs uppercase tracking-[0.2em] text-yellow-400/80 font-[family-name:var(--font-mono)] mb-2">
          Akun
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl @lg:text-3xl font-bold mb-8">
          Pengaturan
        </h1>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3.5 py-2.5 mb-5">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {/* Background jaring-jaring - preferensi lokal, gak nyentuh server */}
          <div className="rounded-2xl border border-yellow-500/20 bg-zinc-900/60 p-5 flex items-start gap-4">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400">
              <Network size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-0.5">Background Jaring-Jaring</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Tampilkan animasi jaring partikel di seluruh halaman. Titik-titik terdekat bakal nempel
                ngikutin kursor kamu.
              </p>
            </div>
            <Toggle on={networkBackground} onClick={() => setNetworkBackground(!networkBackground)} />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm py-6 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Memuat...
            </div>
          ) : (
            <>
              {/* Tunggu izin sebelum chat pribadi */}
              <div className="rounded-2xl border border-yellow-500/20 bg-zinc-900/60 p-5 flex items-start gap-4">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                  <ShieldCheck size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-0.5">Tunggu Izin Sebelum Chat Pribadi</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Kalau aktif, orang lain wajib klik &quot;Minta Izin Mengobrol&quot; dan kamu setujui
                    dulu sebelum mereka bisa kirim pesan pribadi ke kamu.
                  </p>
                </div>
                <Toggle
                  on={requirePermissionForDm}
                  busy={busyKey === "requirePermissionForDm"}
                  onClick={() => patchSettings("requirePermissionForDm", !requirePermissionForDm)}
                />
              </div>

              {/* Akun privat */}
              <div className="rounded-2xl border border-yellow-500/20 bg-zinc-900/60 p-5 flex items-start gap-4">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                  <Lock size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-0.5">Privat Akun</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Profil kamu bakal nampilin label &quot;Akun Privat&quot; ke orang lain yang lihat
                    halaman profil kamu.
                  </p>
                </div>
                <Toggle
                  on={privateAccount}
                  busy={busyKey === "privateAccount"}
                  onClick={() => patchSettings("privateAccount", !privateAccount)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
