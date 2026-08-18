import { createHash } from "crypto";
import { db } from "./db";

const BUCKET = "store-images";

/** lib/image.ts always emits 256px JPEG data URLs. Reject anything else. */
const DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 200_000;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** The subset of Product the storefront cares about, after validation. */
interface PublishedProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  quantity: number;
  image: string | null;
  imageHash: string | null;
}

function toPublished(value: unknown): PublishedProduct | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (p.published !== true) return null;
  if (typeof p.id !== "string" || !p.id) return null;
  if (typeof p.name !== "string" || !p.name.trim()) return null;

  const price = Number(p.sellingPrice);
  const quantity = Number(p.quantity);
  if (!Number.isFinite(price) || price < 0) return null;

  const image = typeof p.image === "string" && p.image ? p.image : null;

  return {
    id: p.id,
    name: p.name.trim(),
    description:
      typeof p.description === "string" && p.description.trim()
        ? p.description.trim()
        : null,
    category:
      typeof p.category === "string" && p.category.trim()
        ? p.category.trim()
        : null,
    price,
    quantity: Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0,
    image,
    imageHash: image ? sha256(image).slice(0, 16) : null,
  };
}

/**
 * Uploads a product photo and returns its public URL, or null if the data URL
 * is unusable. Paths are content-addressed, so unchanged bytes are never
 * re-uploaded and a cached URL can never serve the wrong image.
 */
async function uploadImage(
  storeId: string,
  product: PublishedProduct,
): Promise<string | null> {
  if (!product.image || !product.imageHash) return null;

  const match = DATA_URL.exec(product.image);
  if (!match) return null;

  const bytes = Buffer.from(match[1], "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;

  const path = `${storeId}/${product.id}-${product.imageHash}.jpg`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

  if (error) {
    console.error("[project-catalog] image upload failed:", error);
    return null;
  }

  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Projects the published subset of a merchant's products into store_products.
 *
 * This is a derived read model, never authoritative — it can be rebuilt from
 * the merchant's blob at any time (see /api/store/republish).
 *
 * Short-circuits on an unchanged catalog digest. That matters: queueSync fires
 * after EVERY local mutation including each sale, so without the gate a busy
 * shop would re-project (and re-upload) its whole catalog on every transaction.
 */
export async function projectCatalog(
  userId: string,
  products: unknown[],
): Promise<"skipped" | "projected"> {
  const { data: store } = await db
    .from("stores")
    .select("id, catalog_digest")
    .eq("user_id", userId)
    .maybeSingle();

  // No storefront yet — nothing to project.
  if (!store) return "skipped";

  const storeId = String(store.id);
  const published = products
    .map(toPublished)
    .filter((p): p is PublishedProduct => p !== null);

  const digest = sha256(
    JSON.stringify(
      published.map((p) => [
        p.id,
        p.name,
        p.description,
        p.category,
        p.price,
        p.quantity,
        p.imageHash,
      ]),
    ),
  );

  if (digest === store.catalog_digest) return "skipped";

  const { data: existingRows } = await db
    .from("store_products")
    .select("product_id, image_url, image_hash")
    .eq("store_id", storeId);

  const existing = new Map(
    (existingRows ?? []).map((row) => [
      String(row.product_id),
      {
        imageUrl: (row.image_url as string | null) ?? null,
        imageHash: (row.image_hash as string | null) ?? null,
      },
    ]),
  );

  const now = new Date().toISOString();
  const rows = [];

  for (const product of published) {
    const prior = existing.get(product.id);
    let imageUrl = prior?.imageUrl ?? null;

    // Only re-upload when the bytes actually changed.
    if (product.imageHash && product.imageHash !== prior?.imageHash) {
      imageUrl = await uploadImage(storeId, product);
    } else if (!product.imageHash) {
      imageUrl = null;
    }

    rows.push({
      store_id: storeId,
      product_id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      available_quantity: product.quantity,
      image_url: imageUrl,
      image_hash: product.imageHash,
      updated_at: now,
    });
  }

  if (rows.length > 0) {
    const { error } = await db
      .from("store_products")
      .upsert(rows, { onConflict: "store_id,product_id" });
    if (error) throw new Error(`store_products upsert failed: ${error.message}`);
  }

  // Fetch-then-delete by explicit id list. Do NOT invert this into a
  // `.not("product_id", "in", ...)` filter — PostgREST quoting rules for
  // client-generated ids are easy to get subtly wrong, and a malformed filter
  // here would delete the merchant's entire catalog.
  const publishedIds = new Set(published.map((p) => p.id));
  const staleIds = [...existing.keys()].filter((id) => !publishedIds.has(id));

  if (staleIds.length > 0) {
    const { error } = await db
      .from("store_products")
      .delete()
      .eq("store_id", storeId)
      .in("product_id", staleIds);
    if (error) throw new Error(`store_products delete failed: ${error.message}`);
  }

  await db
    .from("stores")
    .update({ catalog_digest: digest, updated_at: now })
    .eq("id", storeId);

  return "projected";
}

/** Forces the next projection to run even if the catalog is unchanged. */
export async function clearCatalogDigest(storeId: string): Promise<void> {
  await db.from("stores").update({ catalog_digest: null }).eq("id", storeId);
}
