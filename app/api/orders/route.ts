import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveStore, toOrder } from "@/lib/store-server";
import { ACTIVE_ORDER_STATUSES, type OrderStatus } from "@/lib/storefront-types";

const ALL_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "out_for_delivery",
  "delivered",
  "rejected",
  "cancelled",
];

export async function GET(request: NextRequest) {
  const resolved = await resolveStore(request);
  if (resolved instanceof Response) return resolved;

  // No storefront yet is a normal state, not an error.
  if (!resolved.storeId) {
    return Response.json({ orders: [], ordersChangedAt: null });
  }

  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status");
  const since = params.get("since");
  const limit = Math.min(Number(params.get("limit")) || 100, 200);

  let statuses = ACTIVE_ORDER_STATUSES;
  if (statusParam === "all") {
    statuses = ALL_STATUSES;
  } else if (statusParam) {
    const requested = statusParam
      .split(",")
      .filter((s): s is OrderStatus =>
        (ALL_STATUSES as string[]).includes(s),
      );
    if (requested.length > 0) statuses = requested;
  }

  let query = db
    .from("orders")
    .select("*")
    .eq("store_id", resolved.storeId)
    .in("status", statuses)
    .order("placed_at", { ascending: false })
    .limit(limit);

  if (since) query = query.gt("updated_at", since);

  const [{ data: rows }, { data: store }] = await Promise.all([
    query,
    db
      .from("stores")
      .select("orders_changed_at")
      .eq("id", resolved.storeId)
      .maybeSingle(),
  ]);

  return Response.json({
    orders: (rows ?? []).map(toOrder),
    ordersChangedAt: store?.orders_changed_at ?? null,
  });
}
