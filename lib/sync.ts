"use client";

import { localStorageAdapter } from "./storage";
import {
  productsStore,
  salesStore,
  pendingSalesStore,
  settingsStore,
  profileStore,
  storefrontStore,
  ordersStore,
  needsAttentionStore,
  lastSyncStore,
  type SyncStatus,
} from "./store";
import type { Order, StoreProfile } from "./storefront-types";
import type {
  AppSettings,
  PendingSale,
  Product,
  Sale,
  UserProfile,
} from "./types";

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

  // NOTE: storefrontStore and ordersStore are deliberately absent from this
  // body. The push is a full overwrite, so anything included here can be
  // clobbered by a stale device. Storefront state is server-authoritative.
  try {
    const res = await fetch("/api/sync/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        products: productsStore.get(),
        sales: salesStore.get(),
        pendingSales: pendingSalesStore.get(),
        settings: settingsStore.get(),
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
      }),
    });

    // Now that pushes drive a public catalog, a silent failure means the
    // storefront quietly serves stale prices and stock. Record the outcome so
    // Settings can show it instead of implying everything is fine.
    let catalog: SyncStatus["catalog"] = null;
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as {
        catalog?: SyncStatus["catalog"];
      } | null;
      catalog = body?.catalog ?? null;
    }
    lastSyncStore.set({ at: new Date().toISOString(), ok: res.ok, catalog });
  } catch {
    // Offline — local copy is the source of truth; will sync when back online.
    lastSyncStore.set({
      at: new Date().toISOString(),
      ok: false,
      catalog: null,
    });
  }
}

export interface CloudPayload {
  profile: Omit<UserProfile, "deviceRemembered">;
  products: Product[];
  sales: Sale[];
  pendingSales: PendingSale[];
  settings: AppSettings;
  /** Optional so an older server response still hydrates cleanly. */
  store?: StoreProfile | null;
  orders?: Order[];
}

/**
 * Overwrites all local stores with cloud data.
 * Called after a successful login on a new device or a manual "Restore from cloud".
 */
export function hydrateFromCloud(data: CloudPayload): void {
  const pendingSales = data.pendingSales ?? [];
  const orders = data.orders ?? [];

  productsStore.set(data.products);
  salesStore.set(data.sales);
  pendingSalesStore.set(pendingSales);
  settingsStore.set(data.settings);
  storefrontStore.set(data.store ?? null);
  ordersStore.set(orders);

  // An accepted order whose hold is missing locally means this device restored
  // an older blob. Do NOT re-reserve the stock automatically — if the hold does
  // exist on another device, that would deduct it twice. Flag it for review.
  const holdIds = new Set(pendingSales.map((p) => p.id));
  needsAttentionStore.set(
    orders
      .filter(
        (order) =>
          order.status !== "pending" &&
          order.pendingSaleId !== null &&
          !holdIds.has(order.pendingSaleId),
      )
      .map((order) => order.id),
  );

  // deviceRemembered is a per-device flag — start false, let login page set it.
  profileStore.set({ ...data.profile, deviceRemembered: false });
}
