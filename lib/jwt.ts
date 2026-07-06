import { createHmac, timingSafeEqual } from "crypto";

const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): Buffer {
  const s = process.env.SYNC_JWT_SECRET;
  if (!s) throw new Error("Missing SYNC_JWT_SECRET");
  return Buffer.from(s, "utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Issues a signed token encoding the userId and a 30-day expiry. */
export function signToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + EXPIRY_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/**
 * Verifies the token signature and expiry.
 * Returns the userId if valid, or null if invalid / expired.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  try {
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    const { userId, exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { userId: string; exp: number };
    if (Date.now() > exp) return null;
    return userId;
  } catch {
    return null;
  }
}

/** Extracts the raw token from an `Authorization: Bearer <token>` header. */
export function extractBearer(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}
