// Nyimpen "siapa lagi ngetik" per scope (chat global = "global", DM = id percakapan).
// In-memory aja, gak perlu persist - kalau server restart, ya reset, gapapa.
const TYPING_TTL_MS = 4000; // dianggap "masih ngetik" kalau ping-nya < 4 detik lalu

const typingMap = new Map<string, Map<string, { username: string; at: number }>>();

export function pingTyping(scope: string, userId: string, username: string) {
  if (!typingMap.has(scope)) typingMap.set(scope, new Map());
  typingMap.get(scope)!.set(userId, { username, at: Date.now() });
}

export function getTypingUsers(scope: string, excludeUserId: string): string[] {
  const entries = typingMap.get(scope);
  if (!entries) return [];
  const now = Date.now();
  const result: string[] = [];
  for (const [userId, info] of entries) {
    if (userId === excludeUserId) continue;
    if (now - info.at < TYPING_TTL_MS) result.push(info.username);
  }
  return result;
}
