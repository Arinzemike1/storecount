import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractBearer, verifyToken } from "@/lib/jwt";
import { projectCatalog } from "@/lib/project-catalog";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0+/, "");
}

export async function POST(request: NextRequest) {
  const userId = verifyToken(extractBearer(request) ?? "");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    products,
    sales,
    pendingSales,
    settings,
    firstName,
    lastName,
    email,
    phone,
  } = (body ?? {}) as Record<string, unknown>;

  // Reject rather than coerce. A client bug that omits an array used to wipe
  // the cloud copy silently; now it would also take the merchant's public
  // storefront offline. Fail loud instead.
  if (
    !Array.isArray(products) ||
    !Array.isArray(sales) ||
    !Array.isArray(pendingSales)
  ) {
    return Response.json(
      { error: "products, sales and pendingSales must be arrays" },
      { status: 400 },
    );
  }

  // Keep the users row in sync with any profile changes.
  const profileUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof firstName === "string")
    profileUpdate.first_name = firstName.trim();
  if (typeof lastName === "string") profileUpdate.last_name = lastName.trim();
  if (typeof email === "string") profileUpdate.email = email.trim() || null;
  if (typeof phone === "string")
    profileUpdate.phone = normalizePhone(phone) || undefined;

  await db.from("users").update(profileUpdate).eq("id", userId);

  // Full-state upsert — last write wins.
  const { error } = await db.from("user_data").upsert(
    {
      user_id: userId,
      products,
      sales,
      pending_sales: pendingSales,
      settings: settings && typeof settings === "object" ? settings : {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[sync/push] DB error:", error);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }

  // Project the published subset into the storefront's read model. A failure
  // here must NOT fail the sync: the merchant's own data has landed, and the
  // catalog is derived, so the next push (or "Republish" in Settings) retries.
  let catalog: "skipped" | "projected" | "deferred" = "skipped";
  try {
    catalog = await projectCatalog(userId, products);
  } catch (err) {
    console.error("[sync/push] catalog projection failed:", err);
    catalog = "deferred";
  }

  return Response.json({ ok: true, catalog });
}
