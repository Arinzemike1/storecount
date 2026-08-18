import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractBearer, verifyToken } from "@/lib/jwt";
import {
  allocateSlug,
  slugify,
  toStoreProfile,
  UNAUTHORIZED,
} from "@/lib/store-server";
import { RESERVED_SLUGS } from "@/lib/storefront-types";

export async function GET(request: NextRequest) {
  const userId = verifyToken(extractBearer(request) ?? "");
  if (!userId) return UNAUTHORIZED();

  const { data } = await db
    .from("stores")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return Response.json({ store: data ? toStoreProfile(data) : null });
}

/** Fields a merchant may edit. `slug` is handled separately. */
const EDITABLE: Record<string, "string" | "boolean" | "number"> = {
  name: "string",
  description: "string",
  phone: "string",
  address: "string",
  deliveryNote: "string",
  isOpen: "boolean",
  isPublished: "boolean",
  acceptsDelivery: "boolean",
  acceptsPickup: "boolean",
  deliveryFee: "number",
  minOrderTotal: "number",
};

const COLUMN: Record<string, string> = {
  name: "name",
  description: "description",
  phone: "phone",
  address: "address",
  deliveryNote: "delivery_note",
  isOpen: "is_open",
  isPublished: "is_published",
  acceptsDelivery: "accepts_delivery",
  acceptsPickup: "accepts_pickup",
  deliveryFee: "delivery_fee",
  minOrderTotal: "min_order_total",
};

export async function PATCH(request: NextRequest) {
  const userId = verifyToken(extractBearer(request) ?? "");
  if (!userId) return UNAUTHORIZED();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const [key, kind] of Object.entries(EDITABLE)) {
    const value = body[key];
    if (value === undefined) continue;
    const column = COLUMN[key];

    if (kind === "string") {
      if (typeof value !== "string") {
        return Response.json({ error: `${key} must be a string` }, { status: 400 });
      }
      const trimmed = value.trim();
      // `name` is NOT NULL; everything else nulls out when cleared.
      if (key === "name") {
        if (!trimmed) {
          return Response.json({ error: "Store name is required" }, { status: 400 });
        }
        patch[column] = trimmed;
      } else {
        patch[column] = trimmed || null;
      }
    } else if (kind === "boolean") {
      if (typeof value !== "boolean") {
        return Response.json({ error: `${key} must be a boolean` }, { status: 400 });
      }
      patch[column] = value;
    } else {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0) {
        return Response.json(
          { error: `${key} must be a non-negative number` },
          { status: 400 },
        );
      }
      patch[column] = Math.round(num * 100) / 100;
    }
  }

  const { data: existing } = await db
    .from("stores")
    .select("id, slug")
    .eq("user_id", userId)
    .maybeSingle();

  // A merchant may rename their slug, but it must stay unique and non-reserved.
  // Their old link and QR code stop working — the UI warns about this.
  if (typeof body.slug === "string" && body.slug.trim()) {
    const desired = slugify(body.slug);
    if ((RESERVED_SLUGS as readonly string[]).includes(desired)) {
      return Response.json({ error: "That name is not available" }, { status: 409 });
    }
    if (!existing || desired !== existing.slug) {
      const { data: taken } = await db
        .from("stores")
        .select("id")
        .eq("slug", desired)
        .maybeSingle();
      if (taken && (!existing || taken.id !== existing.id)) {
        return Response.json({ error: "That name is taken" }, { status: 409 });
      }
      patch.slug = desired;
    }
  }

  if (existing) {
    const { data, error } = await db
      .from("stores")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[store] update failed:", error);
      return Response.json({ error: "Could not save" }, { status: 500 });
    }
    return Response.json({ store: toStoreProfile(data) });
  }

  // First call creates the storefront. Allocate a slug from the store name.
  const name = typeof patch.name === "string" ? patch.name : "";
  if (!name) {
    return Response.json({ error: "Store name is required" }, { status: 400 });
  }

  const { data: profile } = await db
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return Response.json({ error: "User not found" }, { status: 404 });

  const { data, error } = await db
    .from("stores")
    .insert({
      ...patch,
      user_id: userId,
      slug: typeof patch.slug === "string" ? patch.slug : await allocateSlug(name),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[store] create failed:", error);
    return Response.json({ error: "Could not create storefront" }, { status: 500 });
  }

  return Response.json({ store: toStoreProfile(data) }, { status: 201 });
}
