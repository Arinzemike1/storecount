import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Copy .env.local.example to .env.local and fill in the values.",
  );
}

/**
 * Server-only Supabase client using the service-role key.
 * Never import this in client components — it bypasses Row Level Security.
 */
export const db = createClient(url, key, {
  auth: { persistSession: false },
});
