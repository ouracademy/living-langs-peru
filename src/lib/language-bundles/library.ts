import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import { type GalleryPhase, galleryPhase } from "@/lib/peoples/gallery-photos";
import { getOptionalSupabase } from "@/lib/supabase-optional";

import { repoBundle } from "./fallback.ts";
import { parseBundle } from "./schema.ts";
import type { BundleReadResult } from "./types.ts";

/** One hour, the safety net under on-demand revalidation (spec decision #5). */
export const BUNDLE_REVALIDATE_SECONDS = 3600;

/** Cache tag of a language's published bundle; publishing revalidates it. */
export function bundleTag(language: string): string {
  return `language:${language}`;
}

/**
 * Reads the published bundle of `language` from Supabase. Throws on an error
 * or a malformed row, never answers «none» for it: inside the cache, a throw
 * keeps the last good page, while a «none» would replace it.
 */
export async function readPublishedBundle(
  language: string,
  client: SupabaseClient,
): Promise<BundleReadResult> {
  const { data, error } = await client
    .from("language_bundles")
    .select("version, bundle, published_at")
    .eq("slug", language)
    .maybeSingle();

  if (error) {
    // Only the code: the message can quote the row.
    throw new Error(
      `language_bundles read failed (${(error as { code?: string }).code ?? "unknown"})`,
    );
  }
  if (!data) return { status: "none" };

  const parsed = parseBundle(data.bundle);
  if (
    !parsed.ok ||
    typeof data.version !== "number" ||
    typeof data.published_at !== "string"
  ) {
    throw new Error("language_bundles returned a malformed bundle");
  }
  if (parsed.bundle.language !== language) {
    throw new Error("language_bundles returned another language's bundle");
  }

  return {
    status: "ok",
    bundle: parsed.bundle,
    version: data.version,
    publishedAt: data.published_at,
    origin: "supabase",
  };
}

function fromRepo(language: string): BundleReadResult {
  const bundle = repoBundle(language);
  return bundle
    ? { status: "ok", bundle, version: 0, publishedAt: null, origin: "repo" }
    : { status: "none" };
}

/**
 * The bundle the site shows for `language` (spec decisions #5, #6): the
 * published one, cached per language; the repo's when nothing is published or
 * Supabase is not configured. A failed read falls back too during `next
 * build` and `next dev`, so neither depends on Supabase; in production it
 * throws, and Next keeps serving the last good page.
 */
export async function getLanguageBundle(
  language: string,
  phase: GalleryPhase = galleryPhase(),
): Promise<BundleReadResult> {
  const client = getOptionalSupabase();
  if (!client) return fromRepo(language);

  try {
    const published = await unstable_cache(
      () => readPublishedBundle(language, client),
      ["language-bundle", language],
      { tags: [bundleTag(language)], revalidate: BUNDLE_REVALIDATE_SECONDS },
    )();
    return published.status === "ok" ? published : fromRepo(language);
  } catch (error) {
    if (phase === "production") throw error;
    console.error(
      "language-bundles: read failed, showing the repo bundle",
      error instanceof Error ? error.message : "unknown error",
    );
    return fromRepo(language);
  }
}
