"use client";

import { Store, profileStore, useStore } from "./store";
import type { PinCredential } from "./types";
import type { StorageAdapter } from "./storage";

const PIN_ITERATIONS = 150_000;

/** The unlocked flag lives in sessionStorage so closing the app locks it again. */
const sessionAdapter: StorageAdapter = {
  read<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.sessionStorage.getItem("storecount:" + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  write<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem("storecount:" + key, JSON.stringify(value));
    } catch {
      // ignore
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem("storecount:" + key);
  },
};

const sessionStore = new Store<boolean>("unlocked", false, sessionAdapter);

export function useUnlocked(): boolean {
  return useStore(sessionStore);
}

export function unlockSession(): void {
  sessionStore.set(true);
}

export function lockSession(): void {
  sessionStore.set(false);
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function derivePinHash(
  pin: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

/** Hashes a 4-digit PIN with PBKDF2 + random salt. Never store the raw PIN. */
export async function createPinCredential(pin: string): Promise<PinCredential> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePinHash(pin, salt, PIN_ITERATIONS);
  return { salt: toBase64(salt), hash, iterations: PIN_ITERATIONS };
}

export async function verifyPin(
  pin: string,
  credential: PinCredential,
): Promise<boolean> {
  const hash = await derivePinHash(
    pin,
    fromBase64(credential.salt),
    credential.iterations,
  );
  return hash === credential.hash;
}

/** Normalizes phone numbers for comparison (digits only, drop leading zeros/plus). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0+/, "");
}

export function rememberDevice(): void {
  profileStore.update((profile) =>
    profile ? { ...profile, deviceRemembered: true } : profile,
  );
}
