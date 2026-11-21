import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { adminAuthResponse } from "../admin/basic-auth.ts";
import { getLanguage } from "../languages.ts";
import { hasNoPack } from "../word-jump/availability.ts";
import { getPackClient } from "./library.ts";
import { audioBaseUrlFrom } from "./publishing.ts";

/** Every /api/admin/juego answer: admin data is never cached. */
const NO_STORE = { "Cache-Control": "no-store" };

export function adminJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function adminError(
  status: number,
  error: string,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return adminJson({ error, message, ...extra }, status);
}

export const UNAVAILABLE_MESSAGE =
  "No pudimos hablar con la base de datos. Si el proyecto de Supabase está pausado, reactívalo desde su panel y vuelve a intentar.";

export type AdminContext = {
  language: string;
  client: SupabaseClient;
  audioBaseUrl: string;
};

/**
 * The checks every /api/admin/juego handler runs first, in this order: Basic
 * Auth again (the proxy matcher is not the only barrier, AC-SP5-9), a language
 * of languages.ts that can have a pack, and a configured Supabase. Returns the
 * context, or the response to send instead.
 */
export function openAdminRequest(
  request: Request,
  segment: string,
): AdminContext | Response {
  const denied = adminAuthResponse(request.headers.get("authorization"));
  if (denied) return denied;

  if (!getLanguage(segment)) {
    return adminError(404, "language_not_found", "Esa lengua no existe.");
  }
  if (hasNoPack(segment)) {
    return adminError(
      400,
      "language_without_pack",
      "Esa lengua no tiene juego, por diseño.",
    );
  }

  const client = getPackClient();
  const audioBaseUrl = audioBaseUrlFrom(process.env);
  if (!client || !audioBaseUrl) {
    return adminError(
      503,
      "supabase_not_configured",
      "Supabase no está configurado en este servidor. Avisa al equipo técnico.",
    );
  }

  return { language: segment, client, audioBaseUrl };
}

/** A JSON body, or `undefined` when it is not JSON at all. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
