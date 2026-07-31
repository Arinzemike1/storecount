import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractBearer, verifyToken } from "@/lib/jwt";
import { DEFAULT_SETTINGS } from "@/lib/types";

export async function GET(request: NextRequest) {
  const userId = verifyToken(extractBearer(request) ?? "");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [userResult, dataResult] = await Promise.all([
    db
      .from("users")
      .select(
        "first_name, last_name, email, phone, pin_salt, pin_hash, pin_iterations, created_at",
      )
      .eq("id", userId)
      .single(),
    db
      .from("user_data")
      .select("products, sales, pending_sales, settings")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (userResult.error || !userResult.data) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const u = userResult.data;
  const d = dataResult.data ?? {
    products: [],
    sales: [],
    pending_sales: [],
    settings: DEFAULT_SETTINGS,
  };

  return Response.json({
    profile: {
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email ?? "",
      phone: u.phone,
      pin: { salt: u.pin_salt, hash: u.pin_hash, iterations: u.pin_iterations },
      createdAt: u.created_at,
    },
    products: d.products ?? [],
    sales: d.sales ?? [],
    pendingSales: d.pending_sales ?? [],
    settings: d.settings ?? DEFAULT_SETTINGS,
  });
}
