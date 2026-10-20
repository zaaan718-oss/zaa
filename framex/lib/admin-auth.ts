import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "framex_admin_session";
const SESSION_HOURS = 12;

function getSecret() {
  // Fallback ke AUTH_SECRET kalau ADMIN_SESSION_SECRET belum diisi,
  // supaya tetap jalan walau env belum lengkap - tapi idealnya diisi terpisah.
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || "framex-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createAdminToken(): string {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `admin.${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tag, expiresAtStr, signature] = parts;
  if (tag !== "admin") return false;

  const payload = `${tag}.${expiresAtStr}`;
  const expected = sign(payload);

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

  const expiresAt = Number(expiresAtStr);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return false;

  return true;
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const validUser = process.env.ADMIN_USERNAME || "";
  const validPass = process.env.ADMIN_PASSWORD || "";
  if (!validUser || !validPass) return false;

  const userOk =
    username.length === validUser.length &&
    timingSafeEqual(Buffer.from(username), Buffer.from(validUser));
  const passOk =
    password.length === validPass.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(validPass));

  return userOk && passOk;
}

export { COOKIE_NAME };
