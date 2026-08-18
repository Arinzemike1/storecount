import type { NextRequest } from "next/server";
import { transitionOrder } from "@/lib/order-actions";
import { requireStore } from "@/lib/store-server";

/** Merchant's rider has left with the goods. Stock already moved on accept. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/orders/[id]/dispatch">,
) {
  const resolved = await requireStore(request);
  if (resolved instanceof Response) return resolved;

  const { id } = await ctx.params;

  return transitionOrder({
    storeId: resolved.storeId,
    orderId: id,
    from: ["accepted"],
    to: "out_for_delivery",
    patch: { dispatched_at: new Date().toISOString() },
  });
}
