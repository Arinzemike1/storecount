"use client";

import { createId } from "./id";
import { Store } from "./store";
import { getSyncToken } from "./sync";

/**
 * Order actions that were applied locally but whose server call did not land.
 *
 * Only transitions that are safe to replay live here. "Accept" deliberately
 * does not: it is server-first, so a failed accept means nothing happened
 * locally and there is nothing to reconcile.
 */
export type OutboxActionInput =
  | { type: "deliver"; orderId: string; saleId: string; saleRef: string }
  | { type: "dispatch"; orderId: string }
  | { type: "cancel"; orderId: string; reason?: string }
  | { type: "reject"; orderId: string; reason?: string };

export type OutboxAction = OutboxActionInput & { id: string };

export const outboxStore = new Store<OutboxAction[]>("orderOutbox", []);

export function enqueue(action: OutboxActionInput): void {
  outboxStore.update((all) => [...all, { ...action, id: createId() }]);
}

function bodyFor(action: OutboxAction): Record<string, unknown> {
  switch (action.type) {
    case "deliver":
      return { saleId: action.saleId, saleRef: action.saleRef };
    case "cancel":
    case "reject":
      return { reason: action.reason };
    default:
      return {};
  }
}

/**
 * Replays queued actions. Safe to call often — the server treats a repeat of an
 * already-applied transition as an idempotent replay and returns 200.
 *
 * Returns true if anything was successfully flushed, so callers know to refresh.
 */
export async function flushOutbox(): Promise<boolean> {
  const queued = outboxStore.get();
  if (queued.length === 0) return false;

  const token = getSyncToken();
  if (!token) return false;

  const settled: string[] = [];
  let applied = false;

  for (const action of queued) {
    try {
      const res = await fetch(`/api/orders/${action.orderId}/${action.type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyFor(action)),
      });

      if (res.ok) {
        settled.push(action.id);
        applied = true;
      } else if (res.status >= 400 && res.status < 500) {
        // 404/409 — the order moved on without us. Retrying will never help,
        // so drop it rather than looping forever. The next poll re-syncs state.
        settled.push(action.id);
      }
      // 5xx falls through: keep it queued and try again next tick.
    } catch {
      // Still offline. Stop early — the rest will fail the same way.
      break;
    }
  }

  if (settled.length > 0) {
    const done = new Set(settled);
    outboxStore.update((all) => all.filter((a) => !done.has(a.id)));
  }

  return applied;
}
