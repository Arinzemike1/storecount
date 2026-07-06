"use client";

import { localStorageAdapter } from "./storage";
import {
  productsStore,
  salesStore,
  settingsStore,
  profileStore,
} from "./store";
import type { AppSettings, Product, Sale, UserProfile } from "./types";

const TOKEN_KEY = "sync-token";

export function getSyncToken(): string | null {
  return localStorageAdapter.read<string | null>(TOKEN_KEY, null);
}

export function setSyncToken(token: string): void {
  localStorageAdapter.write(TOKEN_KEY, token);
}

export function clearSyncToken(): void {
  localStorageAdapter.remove(TOKEN_KEY);
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced push — coalesces rapid writes into a single network request.
 * Safe to call after every local mutation; fires ~1.5 s after the last call.
 */
export function queueSync(): void {
  if (typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(pushToCloud, 1500);
}

async function pushToCloud(): Promise<void> {
  const token = getSyncToken();
  if (!token) return;
  const profile = profileStore.get();
  if (!profile) return;

  try {
    await fetch("/api/sync/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: productsStore.get(),
        sales: salesStore.get(),
        settings: settingsStore.get(),
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
      }),
    });
  } catch {
    // Offline — local copy is the source of truth; will sync when back online.
  }
}

export interface CloudPayload {
  profile: Omit<UserProfile, "deviceRemembered">;
  products: Product[];
  sales: Sale[];
  settings: AppSettings;
}

/**
 * Overwrites all local stores with cloud data.
 * Called after a successful login on a new device or a manual "Restore from cloud".
 */
export function hydrateFromCloud(data: CloudPayload): void {
  productsStore.set(data.products);
  salesStore.set(data.sales);
  settingsStore.set(data.settings);
  // deviceRemembered is a per-device flag — start false, let login page set it.
  profileStore.set({ ...data.profile, deviceRemembered: false });
}
