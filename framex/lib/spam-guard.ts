// Deteksi spam sederhana pakai memory (bukan file), karena ini cuma perlu
// data jangka pendek (beberapa detik terakhir) dan gak perlu tahan restart.
const WINDOW_MS = 5000; // jendela waktu 5 detik
const MAX_MESSAGES = 10; // lebih dari ini dalam 5 detik = spam

const recentTimestamps = new Map<string, number[]>();

// Catat 1 pesan baru dari user ini, dan cek apakah dia baru aja jadi spammer.
// Return true kalau dia BARU SAJA melewati batas (biar suspend cuma dipicu
// sekali, bukan tiap pesan setelahnya selama masih dalam jendela waktu).
export function recordMessageAndCheckSpam(userId: string): boolean {
  const now = Date.now();
  const timestamps = (recentTimestamps.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  recentTimestamps.set(userId, timestamps);

  return timestamps.length === MAX_MESSAGES + 1; // pas baru lewat batas
}
