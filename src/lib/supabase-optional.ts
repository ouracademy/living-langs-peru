import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * The server client, or null when the variables are missing.
 * `getSupabaseAdmin` throws in that case, and a site without Supabase
 * configured (CI, a fresh checkout) is a state, not an error: the gallery
 * falls back to the repo photos (spec edicion-fotos #16).
 */
export function getOptionalSupabase(): SupabaseClient | null {
  if (
    !process.env.SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    return null;
  }
  return getSupabaseAdmin();
}
