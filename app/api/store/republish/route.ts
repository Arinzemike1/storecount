import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { clearCatalogDigest, projectCatalog } from "@/lib/project-catalog";
import { requireStore } from "@/lib/store-server";

/**
 * Manual recovery for a catalog that drifted from the merchant's blob — the
 * escape hatch when a sync push reported `catalog: "deferred"`.
 */
export async function POST(request: NextRequest) {
  const resolved = await requireStore(request);
  if (resolved instanceof Response) return resolved;

  const { data } = await db
    .from("user_data")
    .select("products")
    .eq("user_id", resolved.userId)
    .maybeSingle();

  const products = Array.isArray(data?.products) ? data.products : [];

  await clearCatalogDigest(resolved.storeId);

  try {
    await projectCatalog(resolved.userId, products);
  } catch (err) {
    console.error("[store/republish] projection failed:", err);
    return Response.json({ error: "Could not republish" }, { status: 500 });
  }

  const { count } = await db
    .from("store_products")
    .select("product_id", { count: "exact", head: true })
    .eq("store_id", resolved.storeId);

  return Response.json({ ok: true, published: count ?? 0 });
}
