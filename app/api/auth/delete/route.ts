import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractBearer, verifyToken } from "@/lib/jwt";

export async function DELETE(request: NextRequest) {
  const userId = verifyToken(extractBearer(request) ?? "");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // user_data is deleted via ON DELETE CASCADE in the schema.
  const { error } = await db.from("users").delete().eq("id", userId);

  if (error) {
    console.error("[auth/delete] DB error:", error);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
