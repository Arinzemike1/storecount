import type { NextRequest } from "next/server";
import { transitionOrder } from "@/lib/order-actions";
import { requireStore } from "@/lib/store-server";

/**
 * Cancels an order that was already accepted. The client discards the matching
 * local hold, which returns the reserved goods to the shelf.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/orders/[id]/cancel">,
) {
  const resolved = await requireStore(request);
  if (resolved instanceof Response) return resolved;

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  return transitionOrder({
    storeId: resolved.storeId,
    orderId: id,
    from: ["accepted", "out_for_delivery"],
    to: "cancelled",
    patch: { decline_reason: reason || null },
    note: reason || undefined,
  });
}
