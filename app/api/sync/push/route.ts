import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractBearer, verifyToken } from "@/lib/jwt";

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

  const { products, sales, settings, firstName, lastName, email, phone } =
    (body ?? {}) as Record<string, unknown>;

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
      products: Array.isArray(products) ? products : [],
      sales: Array.isArray(sales) ? sales : [],
      settings: settings && typeof settings === "object" ? settings : {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[sync/push] DB error:", error);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
