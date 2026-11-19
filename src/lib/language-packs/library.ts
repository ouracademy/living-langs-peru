import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

import { parsePack } from "./schema.ts";
import type { PackReadResult } from "./types.ts";

/** One hour, the safety net under on-demand revalidation (decision #8). */
export const PACK_REVALIDATE_SECONDS = 3600;

/** Cache tag of a language's published pack; publishing revalidates it. */
export function packTag(language: string): string {
  return `word-jump-pack:${language}`;
}

/**
 * The server client, or null when the variables are missing.
 * `getSupabaseAdmin` throws in that case, and a site without Supabase
 * configured (CI, a fresh checkout) is a state, not an error (AC-SP3-8).
 */
export function getPackClient(): SupabaseClient | null {
  if (
    !process.env.SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    return null;
  }
  return getSupabaseAdmin();
}

/**
 * Reads the published pack of `language` (spec §6.4). Throws on an error or a
 * malformed answer, never returns «none» for it: inside the cache, a throw
 * keeps the last good page, while a «none» would replace it (decision #8).
 */
export async function readPublishedPack(
  language: string,
  client: SupabaseClient | null,
): Promise<PackReadResult> {
  if (!client) return { status: "unconfigured" };

  const { data, error } = await client
    .from("language_packs")
    .select("version, pack, published_at")
    .eq("language", language)
    .maybeSingle();

  if (error) {
    // Only the code: the message can quote the row.
    throw new Error(
      `language_packs read failed (${(error as { code?: string }).code ?? "unknown"})`,
    );
  }
  if (!data) return { status: "none" };

  const parsed = parsePack(data.pack);
  if (
    !parsed.ok ||
    typeof data.version !== "number" ||
    typeof data.published_at !== "string"
  ) {
    throw new Error("language_packs returned a malformed pack");
  }
  if (parsed.pack.language.slug !== language) {
    throw new Error("language_packs returned another language's pack");
  }

  return {
    status: "ok",
    pack: parsed.pack,
    version: data.version,
    publishedAt: data.published_at,
  };
}

/** `readPublishedPack`, cached per language (spec §6.4). */
export function getPublishedPack(language: string): Promise<PackReadResult> {
  return unstable_cache(
    () => readPublishedPack(language, getPackClient()),
    ["word-jump-pack", language],
    { tags: [packTag(language)], revalidate: PACK_REVALIDATE_SECONDS },
  )();
}
