import { createHash } from "crypto";
import { db } from "./db";

/**
 * Exponential lockout for PIN login.
 *
 * A 4-digit PIN is a 10,000-value keyspace. Unthrottled, that falls in minutes
 * — and once merchant phone numbers appear on public storefront pages, the
 * attacker no longer needs to guess the other half of the credential.
 */
const LADDER: { fails: number; lockMs: number }[] = [
  { fails: 10, lockMs: 60 * 60_000 },
  { fails: 5, lockMs: 5 * 60_000 },
  { fails: 3, lockMs: 30_000 },
];

/** Failures decay after this long without an attempt. */
const DECAY_MS = 60 * 60_000;

/** An IP may be behind a shared connection, so it gets more headroom. */
const IP_MULTIPLIER = 4;

function lockFor(fails: number, multiplier: number): number | null {
  for (const step of LADDER) {
    if (fails >= step.fails * multiplier) return step.lockMs;
  }
  return null;
}

export function ipKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || "unknown";
  return `ip:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

export function phoneKey(normalizedPhone: string): string {
  return `phone:${normalizedPhone}`;
}

interface AttemptRow {
  key: string;
  fails: number;
  locked_until: string | null;
  updated_at: string;
}

async function load(keys: string[]): Promise<AttemptRow[]> {
  const { data } = await db.from("login_attempts").select("*").in("key", keys);
  return (data ?? []) as AttemptRow[];
}

/**
 * Returns the number of seconds the caller must wait, or 0 if they may proceed.
 * Fails open on a database error — locking every merchant out of their own
 * shop because the throttle table is unreachable is the worse outcome.
 */
export async function checkLockout(keys: string[]): Promise<number> {
  try {
    const rows = await load(keys);
    const now = Date.now();
    let waitMs = 0;

    for (const row of rows) {
      if (!row.locked_until) continue;
      const until = new Date(row.locked_until).getTime();
      if (until > now) waitMs = Math.max(waitMs, until - now);
    }

    return Math.ceil(waitMs / 1000);
  } catch (err) {
    console.error("[login-throttle] lockout check failed:", err);
    return 0;
  }
}

/** Records a failed attempt against each key and applies the ladder. */
export async function recordFailure(keys: string[]): Promise<void> {
  try {
    const rows = await load(keys);
    const existing = new Map(rows.map((row) => [row.key, row]));
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const updates = keys.map((key) => {
      const row = existing.get(key);
      const stale =
        row && now - new Date(row.updated_at).getTime() > DECAY_MS;
      const fails = (stale || !row ? 0 : row.fails) + 1;
      const multiplier = key.startsWith("ip:") ? IP_MULTIPLIER : 1;
      const lockMs = lockFor(fails, multiplier);

      return {
        key,
        fails,
        locked_until: lockMs ? new Date(now + lockMs).toISOString() : null,
        updated_at: nowIso,
      };
    });

    await db.from("login_attempts").upsert(updates, { onConflict: "key" });
  } catch (err) {
    console.error("[login-throttle] record failure failed:", err);
  }
}

/** Clears the counters after a successful login. */
export async function clearFailures(keys: string[]): Promise<void> {
  try {
    await db.from("login_attempts").delete().in("key", keys);
  } catch (err) {
    console.error("[login-throttle] clear failed:", err);
  }
}
