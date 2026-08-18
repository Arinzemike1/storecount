"use client";

import { useSyncExternalStore } from "react";
import { localStorageAdapter, type StorageAdapter } from "./storage";
import type { Order, StoreProfile } from "./storefront-types";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type PendingSale,
  type Product,
  type Sale,
  type UserProfile,
} from "./types";

/**
 * A tiny observable store persisted through a StorageAdapter.
 * Components subscribe via `useStore` (useSyncExternalStore under the hood).
 */
export class Store<T> {
  private value: T | undefined;
  private listeners = new Set<() => void>();

  constructor(
    private key: string,
    private fallback: T,
    private adapter: StorageAdapter = localStorageAdapter,
  ) {}

  get(): T {
    if (this.value === undefined) {
      this.value = this.adapter.read(this.key, this.fallback);
    }
    return this.value;
  }

  /** Snapshot used during SSR and hydration, before localStorage is readable. */
  getServerSnapshot = (): T => this.fallback;

  getSnapshot = (): T => this.get();

  set(next: T): void {
    this.value = next;
    this.adapter.write(this.key, next);
    this.listeners.forEach((listener) => listener());
  }

  update(fn: (current: T) => T): void {
    this.set(fn(this.get()));
  }

  reset(): void {
    this.value = this.fallback;
    this.adapter.remove(this.key);
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export const productsStore = new Store<Product[]>("products", []);
export const salesStore = new Store<Sale[]>("sales", []);
export const pendingSalesStore = new Store<PendingSale[]>("pendingSales", []);
export const profileStore = new Store<UserProfile | null>("profile", null);
export const settingsStore = new Store<AppSettings>("settings", DEFAULT_SETTINGS);

/**
 * Storefront state. Unlike the stores above these are server-derived caches,
 * NOT the source of truth — the `stores` and `orders` tables are. They are
 * deliberately excluded from the sync push body: the push is a last-write-wins
 * full overwrite, so including them would let a stale device clobber another
 * device's storefront config or resurrect a cancelled order.
 */
export const storefrontStore = new Store<StoreProfile | null>(
  "storefront",
  null,
);
export const ordersStore = new Store<Order[]>("orders", []);

/**
 * Ids of accepted orders with no matching local PendingSale. Happens when a
 * device restores an older blob. Surfaced as a banner for manual review rather
 * than silently re-reserving stock, which would double-deduct if the hold does
 * exist on another device.
 */
export const needsAttentionStore = new Store<string[]>("ordersNeedAttention", []);

export interface SyncStatus {
  at: string;
  ok: boolean;
  catalog: "skipped" | "projected" | "deferred" | null;
}

export const lastSyncStore = new Store<SyncStatus | null>("lastSync", null);

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

export function useProducts(): Product[] {
  return useStore(productsStore);
}

export function useSales(): Sale[] {
  return useStore(salesStore);
}

export function usePendingSales(): PendingSale[] {
  return useStore(pendingSalesStore);
}

export function useProfile(): UserProfile | null {
  return useStore(profileStore);
}

export function useSettings(): AppSettings {
  return useStore(settingsStore);
}

const emptySubscribe = () => () => {};

/**
 * False during SSR/hydration, true after mount — when localStorage-backed
 * stores hold real data. Auth guards wait on this to avoid redirect flashes.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** Wipes every persisted record. Used by "Log out & erase data". */
export function resetAllData(): void {
  productsStore.reset();
  salesStore.reset();
  pendingSalesStore.reset();
  profileStore.reset();
  settingsStore.reset();
  storefrontStore.reset();
  ordersStore.reset();
  needsAttentionStore.reset();
  lastSyncStore.reset();
}
