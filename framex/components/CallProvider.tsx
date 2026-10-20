"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, PhoneIncoming } from "lucide-react";

// Cuma pakai STUN publik gratis (gak ada TURN server). Ini cukup buat
// kebanyakan koneksi rumahan, tapi panggilan BISA gagal konek kalau salah
// satu/dua user ada di jaringan yang NAT-nya ketat (kantor/korporat,
// beberapa jaringan seluler). Kalau nanti butuh, tambahin TURN server di
// sini (butuh layanan TURN terpisah, gak bisa dari server Next.js ini).
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const INCOMING_POLL_MS = 3000;
const ACTIVE_POLL_MS = 1200;

type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "in-call";

interface Peer {
  username: string;
  name: string;
  avatar: string;
}

const CallContext = createContext<{
  startCall: (peer: Peer) => void;
}>({ startCall: () => {} });

export function useCall() {
  return useContext(CallContext);
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStartAt, setCallStartAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const appliedCandidatesRef = useRef(0);
  const activePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incomingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringToneRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  function playBeep() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Autoplay policy browser kadang nolak sebelum ada interaksi user -
      // gak fatal, cuma gak ada bunyi dering.
    }
  }

  function startRingTone() {
    stopRingTone();
    playBeep();
    ringToneRef.current = setInterval(playBeep, 1500);
  }
  function stopRingTone() {
    if (ringToneRef.current) clearInterval(ringToneRef.current);
    ringToneRef.current = null;
  }

  const cleanup = useCallback(() => {
    if (activePollRef.current) clearInterval(activePollRef.current);
    activePollRef.current = null;
    stopRingTone();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    appliedCandidatesRef.current = 0;
    setPhase("idle");
    setPeer(null);
    setMuted(false);
    setCallStartAt(null);
  }, []);

  function buildPeerConnection(username: string) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        fetch(`/api/calls/${username}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ice", candidate: e.candidate.toJSON() }),
        }).catch(() => {});
      }
    };
    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        stopRingTone();
        setPhase("in-call");
        setCallStartAt((prev) => prev ?? Date.now());
      } else if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        if (phaseRef.current !== "idle") {
          setError("Panggilan terputus.");
          cleanup();
        }
      }
    };
    pcRef.current = pc;
    return pc;
  }

  async function getMic(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch {
      setError("Gak bisa akses mic. Izinkan akses mikrofon di browser kamu dulu.");
      return null;
    }
  }

  // ===== CALLER =====
  const startCall = useCallback(async (p: Peer) => {
    if (phaseRef.current !== "idle") return;
    setError(null);
    setPeer(p);
    setPhase("outgoing");

    const stream = await getMic();
    if (!stream) {
      setPhase("idle");
      setPeer(null);
      return;
    }

    try {
      const pc = buildPeerConnection(p.username);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(`/api/calls/${p.username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memulai panggilan.");
        cleanup();
        return;
      }

      activePollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/calls/${p.username}`);
          const d = await r.json();
          const call = d.call;
          if (!call) {
            cleanup();
            return;
          }
          if (call.status === "accepted" && call.answer && pc.signalingState !== "stable") {
            await pc.setRemoteDescription(call.answer);
          }
          const newCandidates: RTCIceCandidateInit[] = (call.candidates ?? []).slice(
            appliedCandidatesRef.current
          );
          for (const c of newCandidates) {
            try {
              await pc.addIceCandidate(c);
            } catch {
              // candidate basi/invalid - aman diabaikan
            }
          }
          appliedCandidatesRef.current += newCandidates.length;

          if (call.status === "declined") {
            setError(`@${p.username} menolak panggilan.`);
            cleanup();
          } else if (call.status === "missed") {
            setError(`@${p.username} gak mengangkat.`);
            cleanup();
          } else if (call.status === "ended") {
            cleanup();
          }
        } catch {
          // koneksi lagi putus-putus, coba lagi di polling berikutnya
        }
      }, ACTIVE_POLL_MS);
    } catch {
      setError("Gagal memulai panggilan. Coba lagi.");
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup]);

  // ===== CALLEE =====
  async function acceptIncoming() {
    if (!peer) return;
    stopRingTone();
    const stream = await getMic();
    if (!stream) {
      cleanup();
      return;
    }

    try {
      const res = await fetch(`/api/calls/${peer.username}`);
      const data = await res.json();
      const call = data.call;
      if (!call?.offer) {
        setError("Panggilan sudah gak tersedia.");
        cleanup();
        return;
      }

      const pc = buildPeerConnection(peer.username);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(call.offer);

      const newCandidates: RTCIceCandidateInit[] = call.candidates ?? [];
      for (const c of newCandidates) {
        try {
          await pc.addIceCandidate(c);
        } catch {
          // abaikan candidate yang gagal ditambahin
        }
      }
      appliedCandidatesRef.current = newCandidates.length;

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await fetch(`/api/calls/${peer.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", answer }),
      });

      setPhase("connecting");

      activePollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/calls/${peer.username}`);
          const d = await r.json();
          const c = d.call;
          if (!c) {
            cleanup();
            return;
          }
          const newOnes: RTCIceCandidateInit[] = (c.candidates ?? []).slice(appliedCandidatesRef.current);
          for (const ic of newOnes) {
            try {
              await pc.addIceCandidate(ic);
            } catch {
              // abaikan
            }
          }
          appliedCandidatesRef.current += newOnes.length;
          if (c.status === "ended") cleanup();
        } catch {
          // koneksi lagi putus-putus, coba lagi di polling berikutnya
        }
      }, ACTIVE_POLL_MS);
    } catch {
      setError("Gagal menyambungkan panggilan. Coba lagi.");
      cleanup();
    }
  }

  async function declineIncoming() {
    if (!peer) return;
    stopRingTone();
    try {
      await fetch(`/api/calls/${peer.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
    } catch {
      // gak masalah kalau gagal ngasih tau server, kita tetap tutup di sisi sendiri
    }
    cleanup();
  }

  async function hangup() {
    const username = peer?.username;
    stopRingTone();
    if (username) {
      try {
        await fetch(`/api/calls/${username}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "end" }),
        });
      } catch {
        // tetap tutup walau request gagal
      }
    }
    cleanup();
  }

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  // Polling global: cek panggilan masuk, cuma jalan kalau lagi idle.
  useEffect(() => {
    if (phase !== "idle") {
      if (incomingPollRef.current) {
        clearInterval(incomingPollRef.current);
        incomingPollRef.current = null;
      }
      return;
    }
    incomingPollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/calls/incoming");
        const data = await res.json();
        if (data.call && phaseRef.current === "idle") {
          setPeer(data.call);
          setPhase("incoming");
          startRingTone();
        }
      } catch {
        // koneksi lagi putus-putus, coba lagi di polling berikutnya
      }
    }, INCOMING_POLL_MS);
    return () => {
      if (incomingPollRef.current) clearInterval(incomingPollRef.current);
    };
  }, [phase]);

  // Kalau lagi "incoming" (nunggu diangkat/ditolak) dan si penelpon
  // keburu nutup/timeout, kita perlu tau juga biar modalnya ilang sendiri.
  useEffect(() => {
    if (phase !== "incoming" || !peer) return;
    const poll = setInterval(async () => {
      const res = await fetch(`/api/calls/${peer.username}`);
      const data = await res.json();
      if (!data.call || data.call.status !== "ringing") {
        cleanup();
      }
    }, ACTIVE_POLL_MS);
    return () => clearInterval(poll);
  }, [phase, peer, cleanup]);

  // Timer durasi panggilan
  useEffect(() => {
    if (phase !== "in-call" || !callStartAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - callStartAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, callStartAt]);

  // Auto-hilangin error toast
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  return (
    <CallContext.Provider value={{ startCall }}>
      {children}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {error && phase === "idle" && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs text-red-300 backdrop-blur-xl">
          {error}
        </div>
      )}

      <AnimatePresence>
        {phase !== "idle" && peer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-black/90 backdrop-blur-xl px-6"
          >
            <motion.div
              animate={phase === "incoming" || phase === "outgoing" ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ repeat: phase === "incoming" || phase === "outgoing" ? Infinity : 0, duration: 1.4 }}
            >
              {peer.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={peer.avatar} alt="" className="h-24 w-24 rounded-full object-cover border-2 border-yellow-400/40" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-zinc-800 border-2 border-yellow-400/40" />
              )}
            </motion.div>

            <div className="text-center">
              <p className="text-lg font-semibold">{peer.name}</p>
              <p className="text-xs text-zinc-500">@{peer.username}</p>
            </div>

            <p className="text-sm text-yellow-400/80 flex items-center gap-1.5">
              {phase === "incoming" && (
                <>
                  <PhoneIncoming size={14} /> Panggilan masuk...
                </>
              )}
              {phase === "outgoing" && "Memanggil..."}
              {phase === "connecting" && "Menghubungkan..."}
              {phase === "in-call" && formatElapsed(elapsed)}
            </p>

            <div className="flex items-center gap-5 mt-4">
              {phase === "incoming" ? (
                <>
                  <button
                    onClick={declineIncoming}
                    className="h-14 w-14 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-400 transition"
                    aria-label="Tolak"
                  >
                    <PhoneOff size={22} />
                  </button>
                  <button
                    onClick={acceptIncoming}
                    className="h-14 w-14 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-400 transition"
                    aria-label="Terima"
                  >
                    <Phone size={22} />
                  </button>
                </>
              ) : (
                <>
                  {phase === "in-call" && (
                    <button
                      onClick={toggleMute}
                      className={`h-14 w-14 flex items-center justify-center rounded-full border transition ${
                        muted ? "bg-yellow-400 text-black border-yellow-400" : "border-zinc-600 text-zinc-300"
                      }`}
                      aria-label={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  )}
                  <button
                    onClick={hangup}
                    className="h-14 w-14 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-400 transition"
                    aria-label="Akhiri panggilan"
                  >
                    <PhoneOff size={22} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CallContext.Provider>
  );
}
