import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { recomputeTotals, sanitizeItems, transitionOrder } from "@/lib/order-actions";
import { requireStore, toOrder } from "@/lib/store-server";

/**
 * Merchant confirms an order. This is the moment stock moves — the client
 * mints the PendingSale id up front and sends it here so the server can record
 * the link before the local hold exists.
 *
 * The merchant may have trimmed lines in the Accept sheet (a product was
 * deleted, or there was less stock than ordered), so totals are recomputed
 * from the submitted items and written back for the customer's tracking page.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/orders/[id]/accept">,
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

  const pendingSaleId = body.pendingSaleId;
  if (typeof pendingSaleId !== "string" || !pendingSaleId) {
    return Response.json({ error: "pendingSaleId is required" }, { status: 400 });
  }

  const { data: row } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("store_id", resolved.storeId)
    .maybeSingle();

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const order = toOrder(row);
  const patch: Record<string, unknown> = {
    pending_sale_id: pendingSaleId,
    accepted_at: new Date().toISOString(),
  };

  if (body.items !== undefined) {
    const items = sanitizeItems(body.items, order.items);
    if (!items) {
      return Response.json({ error: "Invalid items" }, { status: 400 });
    }
    if (items.length === 0) {
      return Response.json(
        { error: "Cannot accept an order with no items — reject it instead" },
        { status: 400 },
      );
    }
    const totals = recomputeTotals(items, order.deliveryFee);
    patch.items = items;
    patch.subtotal = totals.subtotal;
    patch.total = totals.total;
    patch.total_quantity = totals.totalQuantity;
  }

  return transitionOrder({
    storeId: resolved.storeId,
    orderId: id,
    from: ["pending"],
    to: "accepted",
    patch,
    idempotency: { column: "pending_sale_id", value: pendingSaleId },
  });
}
