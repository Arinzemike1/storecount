import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { DEFAULT_SETTINGS } from "@/lib/types";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0+/, "");
}

/**
 * Server-side PIN verification — mirrors the PBKDF2 logic in lib/auth.ts
 * byte-for-byte, including the same base64 helpers, so that hashes
 * computed here always match hashes stored from the browser.
 */
function toBase64(bytes: Uint8Array): string {
  // Mirror browser: btoa(String.fromCharCode(...bytes))
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function derivePinHash(
  pin: string,
  saltBase64: string,
  iterations: number,
): Promise<string> {
  const { subtle } = globalThis.crypto;
  const salt = fromBase64(saltBase64);
  const keyMaterial = await subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { phone, pin } = (body ?? {}) as Record<string, unknown>;

  if (typeof phone !== "string" || typeof pin !== "string") {
    return Response.json({ error: "Missing phone or pin" }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin)) {
    return Response.json({ error: "Invalid PIN format" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);

  const { data: user } = await db
    .from("users")
    .select(
      "id, first_name, last_name, email, phone, pin_salt, pin_hash, pin_iterations, created_at",
    )
    .eq("phone", normalizedPhone)
    .maybeSingle();

  // Return the same error for "not found" and "wrong PIN" to prevent phone enumeration.
  const badCredentials = Response.json(
    { error: "Phone number or PIN is incorrect." },
    { status: 401 },
  );

  if (!user) return badCredentials;

  const hash = await derivePinHash(pin, user.pin_salt, user.pin_iterations);
  if (hash !== user.pin_hash) return badCredentials;

  // Fetch or lazily create the user_data row.
  let { data: userData } = await db
    .from("user_data")
    .select("products, sales, settings")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!userData) {
    await db.from("user_data").insert({
      user_id: user.id,
      products: [],
      sales: [],
      settings: DEFAULT_SETTINGS,
    });
    userData = { products: [], sales: [], settings: DEFAULT_SETTINGS };
  }

  return Response.json({
    token: signToken(user.id),
    profile: {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email ?? "",
      phone: user.phone,
      pin: {
        salt: user.pin_salt,
        hash: user.pin_hash,
        iterations: user.pin_iterations,
      },
      createdAt: user.created_at,
    },
    products: userData.products ?? [],
    sales: userData.sales ?? [],
    settings: userData.settings ?? DEFAULT_SETTINGS,
  });
}
