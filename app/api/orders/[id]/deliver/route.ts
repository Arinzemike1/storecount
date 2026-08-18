import type { NextRequest } from "next/server";
import { transitionOrder } from "@/lib/order-actions";
import { requireStore } from "@/lib/store-server";

/**
 * Goods handed over and paid for. The client has already run
 * checkoutPendingSale locally (a checkout cannot be undone, so it happens
 * first), and sends the resulting sale id/ref here to close the loop.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/orders/[id]/deliver">,
) {
  const resolved = await requireStore(request);
  if (resolved instanceof Response) return resolved;

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const saleId = body.saleId;
  if (typeof saleId !== "string" || !saleId) {
    return Response.json({ error: "saleId is required" }, { status: 400 });
  }
  const saleRef = typeof body.saleRef === "string" ? body.saleRef : null;

  return transitionOrder({
    storeId: resolved.storeId,
    orderId: id,
    from: ["accepted", "out_for_delivery"],
    to: "delivered",
    patch: {
      sale_id: saleId,
      sale_ref: saleRef,
      payment_status: "paid",
      delivered_at: new Date().toISOString(),
    },
    idempotency: { column: "sale_id", value: saleId },
  });
}
