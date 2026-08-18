import { db } from "./db";
import { toOrder } from "./store-server";
import type { Order, OrderStatus } from "./storefront-types";

export interface TransitionOptions {
  storeId: string;
  orderId: string;
  /** Statuses the order may legally be in for this transition. */
  from: OrderStatus[];
  to: OrderStatus;
  /** Extra columns to write alongside the status change. */
  patch?: Record<string, unknown>;
  actor?: "customer" | "merchant" | "system";
  note?: string;
  /**
   * Identifies a retry of this exact call. When the order is already in the
   * target status and this column already holds this value, the call is
   * treated as an idempotent replay and returns 200 instead of 409. This is
   * what makes the client's offline retry outbox safe.
   */
  idempotency?: { column: string; value: string | null };
}

/**
 * Moves an order between statuses using a conditional update as the
 * concurrency primitive — the `.in("status", from)` guard makes a double
 * transition impossible without needing an explicit transaction.
 */
export async function transitionOrder(
  options: TransitionOptions,
): Promise<Response> {
  const { storeId, orderId, from, to, patch = {}, note } = options;
  const actor = options.actor ?? "merchant";
  const now = new Date().toISOString();

  const { data: before } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!before) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { data: updated } = await db
    .from("orders")
    .update({ ...patch, status: to, updated_at: now })
    .eq("id", orderId)
    .eq("store_id", storeId)
    .in("status", from)
    .select("*")
    .maybeSingle();

  if (!updated) {
    // Either someone else moved it first, or this is a retry of a call that
    // already succeeded. Re-read to tell those apart.
    const { data: current } = await db
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!current) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const key = options.idempotency;
    const isReplay =
      current.status === to &&
      (!key || current[key.column as keyof typeof current] === key.value);

    if (isReplay) {
      return Response.json({ order: toOrder(current) });
    }

    return Response.json(
      { error: "Conflict", order: toOrder(current) },
      { status: 409 },
    );
  }

  await db.from("order_events").insert({
    order_id: orderId,
    from_status: before.status,
    to_status: to,
    actor,
    note: note ?? null,
  });

  return Response.json({ order: toOrder(updated) });
}

/** Recomputes order money from a merchant-adjusted item list. */
export function recomputeTotals(
  items: Order["items"],
  deliveryFee: number,
): { subtotal: number; total: number; totalQuantity: number } {
  let subtotal = 0;
  let totalQuantity = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
    totalQuantity += item.quantity;
  }
  subtotal = Math.round(subtotal * 100) / 100;
  return {
    subtotal,
    total: Math.round((subtotal + deliveryFee) * 100) / 100,
    totalQuantity,
  };
}

/** Validates a merchant-submitted item list against the order's own items. */
export function sanitizeItems(
  submitted: unknown,
  original: Order["items"],
): Order["items"] | null {
  if (!Array.isArray(submitted)) return null;

  const byId = new Map(original.map((item) => [item.productId, item]));
  const result: Order["items"] = [];

  for (const raw of submitted) {
    if (!raw || typeof raw !== "object") return null;
    const line = raw as Record<string, unknown>;
    const productId = String(line.productId ?? "");
    const source = byId.get(productId);
    // The merchant may drop lines or reduce quantities, never add new products
    // or raise a quantity above what the customer actually ordered.
    if (!source) return null;

    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) return null;
    if (quantity > source.quantity) return null;
    if (quantity === 0) continue;

    result.push({ ...source, quantity });
  }

  return result;
}
