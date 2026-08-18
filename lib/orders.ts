"use client";

import { useEffect, useRef } from "react";
import { createId } from "./id";
import {
  checkoutPendingSale,
  discardPendingSale,
  savePendingSale,
  type CartLine,
} from "./inventory";
import { enqueue, flushOutbox } from "./order-outbox";
import {
  needsAttentionStore,
  ordersStore,
  storefrontStore,
  useStore,
} from "./store";
import type { Order, StoreProfile } from "./storefront-types";
import { getSyncToken } from "./sync";

export function useOrders(): Order[] {
  return useStore(ordersStore);
}

export function useStorefront(): StoreProfile | null {
  return useStore(storefrontStore);
}

export function useOrdersNeedingAttention(): string[] {
  return useStore(needsAttentionStore);
}

export function usePendingOrderCount(): number {
  return useStore(ordersStore).filter((o) => o.status === "pending").length;
}

export class OrderActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OrderActionError";
  }
}

function authHeaders(): Record<string, string> | null {
  const token = getSyncToken();
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function post(path: string, body: unknown): Promise<Order> {
  const headers = authHeaders();
  if (!headers) throw new OrderActionError("Not signed in", 401);

  const res = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const data = (await res.json().catch(() => null)) as
    | { order?: Order; error?: string }
    | null;

  if (!res.ok) {
    // A 409 carries the server's current version of the order — fold it in so
    // the merchant immediately sees why their action was refused.
    if (data?.order) mergeOrder(data.order);
    throw new OrderActionError(data?.error ?? "Could not update order", res.status);
  }

  if (!data?.order) throw new OrderActionError("Malformed response", res.status);
  mergeOrder(data.order);
  return data.order;
}

function mergeOrder(order: Order): void {
  ordersStore.update((all) => {
    const index = all.findIndex((o) => o.id === order.id);
    if (index === -1) return [order, ...all];
    const next = [...all];
    next[index] = order;
    return next;
  });
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function refreshStore(): Promise<void> {
  const headers = authHeaders();
  if (!headers) return;
  const res = await fetch("/api/store", { headers });
  if (!res.ok) return;
  const data = (await res.json()) as { store: StoreProfile | null };
  storefrontStore.set(data.store);
}

export async function refreshOrders(): Promise<void> {
  const headers = authHeaders();
  if (!headers) return;
  const res = await fetch("/api/orders?status=all&limit=200", { headers });
  if (!res.ok) return;
  const data = (await res.json()) as { orders: Order[] };
  ordersStore.set(data.orders);
  reconcile(data.orders);
}

/** Drops attention flags for orders that no longer need review. */
function reconcile(orders: Order[]): void {
  const live = new Set(
    orders
      .filter((o) => o.status === "accepted" || o.status === "out_for_delivery")
      .map((o) => o.id),
  );
  needsAttentionStore.update((ids) => ids.filter((id) => live.has(id)));
}

export async function updateStore(
  patch: Partial<StoreProfile> & { slug?: string },
): Promise<StoreProfile> {
  const headers = authHeaders();
  if (!headers) throw new OrderActionError("Not signed in", 401);

  const previous = storefrontStore.get();
  // Optimistic: the toggles in Settings should feel instant.
  if (previous) storefrontStore.set({ ...previous, ...patch } as StoreProfile);

  const res = await fetch("/api/store", {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
  });

  const data = (await res.json().catch(() => null)) as
    | { store?: StoreProfile; error?: string }
    | null;

  if (!res.ok || !data?.store) {
    storefrontStore.set(previous);
    throw new OrderActionError(data?.error ?? "Could not save", res.status);
  }

  storefrontStore.set(data.store);
  return data.store;
}

export async function republishCatalog(): Promise<number> {
  const headers = authHeaders();
  if (!headers) throw new OrderActionError("Not signed in", 401);
  const res = await fetch("/api/store/republish", { method: "POST", headers });
  const data = (await res.json().catch(() => null)) as
    | { published?: number; error?: string }
    | null;
  if (!res.ok) {
    throw new OrderActionError(data?.error ?? "Could not republish", res.status);
  }
  return data?.published ?? 0;
}

// ---------------------------------------------------------------------------
// Transitions
//
// Ordering of the local write vs the server call is deliberate and differs per
// action. See the comments on each.
// ---------------------------------------------------------------------------

/**
 * Confirms an order and reserves the stock.
 *
 * SERVER FIRST: the server is the arbiter of order status, and a failed accept
 * must leave no local trace. If the network dies after the server accepted but
 * before the local hold is written, the order carries a pendingSaleId with no
 * matching hold — caught by the reconciliation banner on the next hydrate.
 * Stock unreserved and flagged beats stock reserved twice.
 */
export async function acceptOrder(order: Order, lines: CartLine[]): Promise<void> {
  const pendingSaleId = createId();

  await post(`/api/orders/${order.id}/accept`, {
    pendingSaleId,
    items: lines.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
    })),
  });

  savePendingSale(lines, order.customerName, pendingSaleId, order.id);
}

export async function rejectOrder(order: Order, reason?: string): Promise<void> {
  await post(`/api/orders/${order.id}/reject`, { reason });
}

export async function dispatchOrder(order: Order): Promise<void> {
  try {
    await post(`/api/orders/${order.id}/dispatch`, {});
  } catch (err) {
    if (err instanceof OrderActionError && err.status !== 0) throw err;
    enqueue({ type: "dispatch", orderId: order.id });
  }
}

/**
 * Hands over the goods and takes payment.
 *
 * LOCAL FIRST: checkoutPendingSale mints the sale id and ref and cannot be
 * undone, so it must happen before the server call. If the call fails, the
 * action goes to the outbox and replays — the server treats a repeat with the
 * same saleId as an idempotent replay.
 */
export async function deliverOrder(order: Order, lines: CartLine[]): Promise<void> {
  if (!order.pendingSaleId) {
    throw new OrderActionError("This order has no matching hold", 409);
  }

  const sale = checkoutPendingSale(order.pendingSaleId, lines);

  try {
    await post(`/api/orders/${order.id}/deliver`, {
      saleId: sale.id,
      saleRef: sale.ref,
    });
  } catch {
    enqueue({
      type: "deliver",
      orderId: order.id,
      saleId: sale.id,
      saleRef: sale.ref,
    });
  }
}

/** Cancels an accepted order, returning the reserved goods to the shelf. */
export async function cancelAcceptedOrder(
  order: Order,
  reason?: string,
): Promise<void> {
  if (order.pendingSaleId) discardPendingSale(order.pendingSaleId);

  try {
    await post(`/api/orders/${order.id}/cancel`, { reason });
  } catch {
    enqueue({ type: "cancel", orderId: order.id, reason });
  }
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

const ACTIVE_INTERVAL = 20_000;
const IDLE_INTERVAL = 60_000;
/** Back off to IDLE_INTERVAL after this long with no change. */
const IDLE_AFTER = 5 * 60_000;

/**
 * Keeps the merchant's order list fresh while the app is foregrounded.
 *
 * Polls a deliberately tiny endpoint and only fetches the full list when the
 * store's orders_changed_at actually moves. Stops entirely when the tab is
 * hidden — this runs on phones on metered data.
 *
 * Known limitation: polling cannot reach a merchant whose phone is in their
 * pocket. Web Push is the real answer and is the first item in Phase 2.
 */
export function useOrderPolling(): void {
  const lastChangedAt = useRef<string | null>(null);
  // 0 until the effect runs — reading a clock during render is impure.
  const lastChangeSeen = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);

  useEffect(() => {
    let cancelled = false;
    lastChangeSeen.current = Date.now();

    async function tick(): Promise<void> {
      if (cancelled || running.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      if (!getSyncToken()) return;

      running.current = true;
      try {
        if (await flushOutbox()) await refreshOrders();

        const headers = authHeaders();
        if (!headers) return;

        const res = await fetch("/api/orders/poll", { headers });
        if (!res.ok) return;

        const data = (await res.json()) as { ordersChangedAt: string | null };
        if (data.ordersChangedAt !== lastChangedAt.current) {
          lastChangedAt.current = data.ordersChangedAt;
          lastChangeSeen.current = Date.now();
          await refreshOrders();
        }
      } catch {
        // Offline. Try again on the next tick.
      } finally {
        running.current = false;
        schedule();
      }
    }

    function schedule(): void {
      if (cancelled) return;
      if (timer.current) clearTimeout(timer.current);
      if (typeof document !== "undefined" && document.hidden) return;

      const idle = Date.now() - lastChangeSeen.current > IDLE_AFTER;
      timer.current = setTimeout(tick, idle ? IDLE_INTERVAL : ACTIVE_INTERVAL);
    }

    function onWake(): void {
      if (typeof document !== "undefined" && document.hidden) {
        if (timer.current) clearTimeout(timer.current);
        return;
      }
      void tick();
    }

    // The cached storefront profile can be stale (edited on another device),
    // and the poll tick never refetches it.
    void refreshStore();
    void tick();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onWake);
    };
  }, []);
}
