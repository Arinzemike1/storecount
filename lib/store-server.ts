import { randomBytes } from "crypto";
import { db } from "./db";
import { extractBearer, verifyToken } from "./jwt";
import {
  ACTIVE_ORDER_STATUSES,
  RESERVED_SLUGS,
  type Order,
  type OrderItem,
  type StoreProfile,
} from "./storefront-types";

type StoreRow = Record<string, unknown>;

export function toStoreProfile(row: StoreRow): StoreProfile {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    currency: String(row.currency ?? "NGN"),
    isOpen: Boolean(row.is_open),
    isPublished: Boolean(row.is_published),
    acceptsDelivery: Boolean(row.accepts_delivery),
    acceptsPickup: Boolean(row.accepts_pickup),
    // numeric(12,2) comes back from PostgREST as a string.
    deliveryFee: Number(row.delivery_fee ?? 0),
    deliveryNote: (row.delivery_note as string | null) ?? null,
    minOrderTotal: Number(row.min_order_total ?? 0),
  };
}

export function toOrder(row: StoreRow): Order {
  return {
    id: String(row.id),
    ref: String(row.ref),
    storeId: String(row.store_id),
    status: row.status as Order["status"],
    paymentMethod: row.payment_method as Order["paymentMethod"],
    paymentStatus: row.payment_status as Order["paymentStatus"],
    fulfilmentMethod: row.fulfilment_method as Order["fulfilmentMethod"],
    items: (row.items as OrderItem[]) ?? [],
    totalQuantity: Number(row.total_quantity ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    total: Number(row.total ?? 0),
    currency: String(row.currency ?? "NGN"),
    customerName: String(row.customer_name ?? ""),
    customerPhone: String(row.customer_phone ?? ""),
    deliveryAddress: (row.delivery_address as string | null) ?? null,
    customerNote: (row.customer_note as string | null) ?? null,
    pendingSaleId: (row.pending_sale_id as string | null) ?? null,
    saleId: (row.sale_id as string | null) ?? null,
    saleRef: (row.sale_ref as string | null) ?? null,
    declineReason: (row.decline_reason as string | null) ?? null,
    placedAt: String(row.placed_at),
    acceptedAt: (row.accepted_at as string | null) ?? null,
    dispatchedAt: (row.dispatched_at as string | null) ?? null,
    deliveredAt: (row.delivered_at as string | null) ?? null,
    updatedAt: String(row.updated_at),
  };
}

/**
 * Loads a merchant's storefront profile and the orders still needing their
 * attention. Shared by /api/sync/pull and /api/auth/login — both feed
 * hydrateFromCloud, so anything added to one payload must be added to both or
 * login silently produces a partial state.
 */
export async function loadStorefront(
  userId: string,
): Promise<{ store: StoreProfile | null; orders: Order[] }> {
  const { data: storeRow } = await db
    .from("stores")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!storeRow) return { store: null, orders: [] };

  const store = toStoreProfile(storeRow);

  const { data: orderRows } = await db
    .from("orders")
    .select("*")
    .eq("store_id", store.id)
    .in("status", ACTIVE_ORDER_STATUSES)
    .order("placed_at", { ascending: false })
    .limit(100);

  return { store, orders: (orderRows ?? []).map(toOrder) };
}

export const UNAUTHORIZED = () =>
  Response.json({ error: "Unauthorized" }, { status: 401 });

/**
 * Resolves the caller's user and their store, tolerating the store not
 * existing yet (the merchant hasn't opened a storefront). Returns a Response
 * only when authentication itself fails.
 */
export async function resolveStore(
  request: Request,
): Promise<{ userId: string; storeId: string | null } | Response> {
  const userId = verifyToken(extractBearer(request) ?? "");
  if (!userId) return UNAUTHORIZED();

  const { data } = await db
    .from("stores")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  return { userId, storeId: data ? String(data.id) : null };
}

/**
 * Like resolveStore, but 404s when the merchant has no storefront yet. Use for
 * every route that only makes sense once a store exists.
 */
export async function requireStore(
  request: Request,
): Promise<{ userId: string; storeId: string } | Response> {
  const resolved = await resolveStore(request);
  if (resolved instanceof Response) return resolved;
  if (!resolved.storeId) {
    return Response.json({ error: "No storefront" }, { status: 404 });
  }
  return { userId: resolved.userId, storeId: resolved.storeId };
}

/** Slugify without uniqueness: lowercase, dash-separated, 2-40 chars. */
export function slugify(desired: string): string {
  const base = desired
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 38)
    .replace(/-$/, "");
  // The CHECK constraint requires at least 3 characters.
  return base.length >= 3 ? base : "store";
}

const SUFFIX_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function randomSuffix(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const byte of bytes) out += SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length];
  return out;
}

/**
 * Turns a business name into a unique, non-reserved slug.
 *
 * Reserved names matter: the storefront routes every root path through
 * `/[slug]`, so a store called "api" would shadow its API. Add to
 * RESERVED_SLUGS before adding any new top-level route.
 */
export async function allocateSlug(desired: string): Promise<string> {
  const base = slugify(desired);
  const reserved = new Set<string>(RESERVED_SLUGS);

  const candidates: string[] = reserved.has(base) ? [] : [base];
  for (let n = 2; n <= 20; n++) candidates.push(`${base}-${n}`);

  for (const candidate of candidates) {
    if (reserved.has(candidate)) continue;
    const { data } = await db
      .from("stores")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }

  // Fall back to a random suffix. Collision odds are negligible, and the
  // unique constraint is the real backstop if one ever happens.
  return `${base}-${randomSuffix()}`;
}

/** 32 random bytes. The only credential a guest holds for their order. */
export function createTrackingToken(): string {
  return randomBytes(32).toString("base64url");
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Human-friendly order reference, e.g. "OD-7K4M9Q". Display only. */
export function createOrderRef(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const byte of bytes) out += REF_ALPHABET[byte % REF_ALPHABET.length];
  return `OD-${out}`;
}
