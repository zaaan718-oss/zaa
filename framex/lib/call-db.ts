// Signaling server sederhana buat panggilan suara WebRTC antar 2 user.
// Disimpan in-memory (bukan di data/*.json) karena ini state SEMENTARA -
// begitu panggilan selesai, gak ada gunanya disimpan permanen. Pola ini
// sama kayak lib/typing.ts & lib/spam-guard.ts.
//
// Server cuma jadi "kurir" buat nukerin SDP offer/answer & ICE candidate -
// audio asli ngalir langsung peer-to-peer antar browser (WebRTC), gak
// lewat server ini sama sekali.

export type CallStatus = "ringing" | "accepted" | "declined" | "ended" | "missed";

interface CandidateMsg {
  from: string; // id user yang ngirim candidate ini
  candidate: RTCIceCandidateInit;
}

export interface CallSession {
  id: string;
  callerId: string;
  calleeId: string;
  status: CallStatus;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidates: CandidateMsg[];
  createdAt: number;
  updatedAt: number;
}

const calls = new Map<string, CallSession>();

const RING_TIMEOUT_MS = 45_000; // gak diangkat 45 detik -> dianggap missed call
const STALE_MS = 2 * 60 * 1000; // sesi yang udah berakhir dibersihin setelah 2 menit

function pairId(a: string, b: string): string {
  return [a, b].sort().join("__");
}

// Dipanggil tiap kali sesi di-baca, biar status basi (ringing kelamaan /
// udah berakhir lama) otomatis ke-update tanpa perlu cron job terpisah.
function settle(session: CallSession): CallSession | null {
  const now = Date.now();
  if (session.status === "ringing" && now - session.createdAt > RING_TIMEOUT_MS) {
    session.status = "missed";
    session.updatedAt = now;
  }
  if (
    (session.status === "ended" || session.status === "declined" || session.status === "missed") &&
    now - session.updatedAt > STALE_MS
  ) {
    calls.delete(session.id);
    return null;
  }
  return session;
}

export function startCall(
  callerId: string,
  calleeId: string,
  offer: RTCSessionDescriptionInit
): { ok: true; session: CallSession } | { ok: false; error: string } {
  const id = pairId(callerId, calleeId);
  const existing = calls.get(id);
  if (existing && settle(existing) && (existing.status === "ringing" || existing.status === "accepted")) {
    return { ok: false, error: "Masih ada panggilan aktif dengan user ini." };
  }
  const now = Date.now();
  const session: CallSession = {
    id,
    callerId,
    calleeId,
    status: "ringing",
    offer,
    candidates: [],
    createdAt: now,
    updatedAt: now,
  };
  calls.set(id, session);
  return { ok: true, session };
}

export function getCall(userA: string, userB: string): CallSession | null {
  const session = calls.get(pairId(userA, userB));
  if (!session) return null;
  return settle(session);
}

// Nyari apakah "userId" lagi diteleponin orang lain (status ringing), ke
// mana pun pasangan percakapannya - dipakai buat notifikasi panggilan
// masuk yang muncul di halaman mana pun, bukan cuma pas lagi buka DM-nya.
export function findIncomingRinging(userId: string): CallSession | null {
  for (const session of calls.values()) {
    if (session.calleeId === userId) {
      const settled = settle(session);
      if (settled?.status === "ringing") return settled;
    }
  }
  return null;
}

export function acceptCall(
  callerId: string,
  calleeId: string,
  answer: RTCSessionDescriptionInit
): CallSession | null {
  const session = calls.get(pairId(callerId, calleeId));
  if (!session || session.status !== "ringing") return null;
  session.status = "accepted";
  session.answer = answer;
  session.updatedAt = Date.now();
  return session;
}

export function declineCall(callerId: string, calleeId: string): CallSession | null {
  const session = calls.get(pairId(callerId, calleeId));
  if (!session) return null;
  session.status = "declined";
  session.updatedAt = Date.now();
  return session;
}

export function endCall(userA: string, userB: string): CallSession | null {
  const session = calls.get(pairId(userA, userB));
  if (!session) return null;
  session.status = "ended";
  session.updatedAt = Date.now();
  return session;
}

export function addCandidate(
  userA: string,
  userB: string,
  from: string,
  candidate: RTCIceCandidateInit
): void {
  const session = calls.get(pairId(userA, userB));
  if (!session) return;
  session.candidates.push({ from, candidate });
  session.updatedAt = Date.now();
}
