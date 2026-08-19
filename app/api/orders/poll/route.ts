import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveStore } from "@/lib/store-server";

/**
 * The cheap tick the merchant client polls every ~20s while foregrounded: one
 * indexed row plus a count. The full order list is only fetched when
 * `ordersChangedAt` actually moves.
 */
export async function GET(request: NextRequest) {
  const resolved = await resolveStore(request);
  if (resolved instanceof Response) return resolved;

  if (!resolved.storeId) {
    return Response.json({ ordersChangedAt: null, pendingCount: 0 });
  }

  const [{ data: store }, { count }] = await Promise.all([
    db
      .from("stores")
      .select("orders_changed_at")
      .eq("id", resolved.storeId)
      .maybeSingle(),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", resolved.storeId)
      .eq("status", "pending"),
  ]);

  return Response.json({
    ordersChangedAt: store?.orders_changed_at ?? null,
    pendingCount: count ?? 0,
  });
}
