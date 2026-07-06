import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { DEFAULT_SETTINGS } from "@/lib/types";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0+/, "");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { firstName, lastName, email, phone, pinSalt, pinHash, pinIterations } =
    (body ?? {}) as Record<string, unknown>;

  if (
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof phone !== "string" ||
    typeof pinSalt !== "string" ||
    typeof pinHash !== "string" ||
    typeof pinIterations !== "number"
  ) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 7) {
    return Response.json({ error: "Invalid phone number" }, { status: 400 });
  }

  // Check for an existing account with this phone number.
  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existing) {
    return Response.json(
      { error: "An account with this phone number already exists." },
      { status: 409 },
    );
  }

  const { data: user, error } = await db
    .from("users")
    .insert({
      phone: normalizedPhone,
      email: typeof email === "string" && email.trim() ? email.trim() : null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      pin_salt: pinSalt,
      pin_hash: pinHash,
      pin_iterations: pinIterations,
    })
    .select("id")
    .single();

  if (error || !user) {
    console.error("[register] DB error:", error);
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }

  await db.from("user_data").insert({
    user_id: user.id,
    products: [],
    sales: [],
    settings: DEFAULT_SETTINGS,
  });

  return Response.json({ token: signToken(user.id) }, { status: 201 });
}
