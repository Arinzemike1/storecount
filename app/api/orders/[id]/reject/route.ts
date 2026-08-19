import type { NextRequest } from "next/server";
import { transitionOrder } from "@/lib/order-actions";
import { requireStore } from "@/lib/store-server";

/** Declines a request before it ever touches stock. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/orders/[id]/reject">,
) {
  const resolved = await requireStore(request);
  if (resolved instanceof Response) return resolved;

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  return transitionOrder({
    storeId: resolved.storeId,
    orderId: id,
    from: ["pending"],
    to: "rejected",
    patch: { decline_reason: reason || null },
    note: reason || undefined,
  });
}
