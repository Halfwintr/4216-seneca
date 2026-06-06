import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client using the service role key. SERVER ONLY.
 * Bypasses RLS — use only in trusted server contexts (seed scripts, admin
 * tasks). Never import this into client code.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
