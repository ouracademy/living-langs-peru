import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getOptionalSupabase } from "@/lib/supabase-optional";

import { adminAuthResponse } from "../admin/basic-auth.ts";
import { adminError } from "../language-packs/admin-route.ts";
import { audioBaseUrlFrom } from "../language-packs/publishing.ts";
import { BUNDLE_LANGUAGES, type BundleLanguage } from "./types.ts";

export {
  adminError,
  adminJson,
  readJsonBody,
  UNAVAILABLE_MESSAGE,
} from "../language-packs/admin-route.ts";

export type BundleAdminContext = {
  language: BundleLanguage;
  client: SupabaseClient;
  /** Public URL of the audio bucket, for `validateBundle`. */
  audioBaseUrl: string | undefined;
};

export function isBundleLanguage(value: string): value is BundleLanguage {
  return (BUNDLE_LANGUAGES as readonly string[]).includes(value);
}

/**
 * The checks every /api/admin/lenguas handler runs first, in this order:
 * Basic Auth again (the proxy matcher is not the only barrier), one of the two
 * languages (spec gestor-lenguas decision #1) and a configured Supabase.
 * Returns the context, or the response to send instead.
 */
export function openBundleRequest(
  request: Request,
  segment: string,
): BundleAdminContext | Response {
  const denied = adminAuthResponse(request.headers.get("authorization"));
  if (denied) return denied;

  if (!isBundleLanguage(segment)) {
    return adminError(404, "language_not_found", "Esa lengua no existe.");
  }

  const client = getOptionalSupabase();
  if (!client) {
    return adminError(
      503,
      "supabase_not_configured",
      "Supabase no está configurado en este servidor. Avisa al equipo técnico.",
    );
  }

  return {
    language: segment,
    client,
    audioBaseUrl: audioBaseUrlFrom(process.env) ?? undefined,
  };
}
