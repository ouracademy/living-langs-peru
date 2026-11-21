import "server-only";

import { unstable_cache } from "next/cache";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { getOptionalSupabase } from "@/lib/supabase-optional";

import { readGalleryRow } from "./gallery-store";
import type { Photo } from "./types";

/** One hour, the safety net under on-demand revalidation (spec #15). */
export const GALLERY_REVALIDATE_SECONDS = 3600;

/** Cache tag of a gallery; saving in /admin/fotos revalidates it. */
export function galleryTag(slug: string): string {
  return `gallery:${slug}`;
}

export type GalleryPhase = "build" | "development" | "production";

/**
 * Where the page is being rendered. `next build` sets NEXT_PHASE to
 * PHASE_PRODUCTION_BUILD; `next start` runs with NODE_ENV=production.
 */
export function galleryPhase(
  env: Readonly<Record<string, string | undefined>> = process.env,
): GalleryPhase {
  if (env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return "build";
  return env.NODE_ENV === "production" ? "production" : "development";
}

/**
 * The photos the public gallery shows (spec #15, #16): the stored ones, or
 * `fallback` (the repo's JSON) when Supabase is not configured or has no row
 * yet. A failed read also falls back during `next build` and `next dev`, so
 * neither depends on Supabase; in production it throws, and Next keeps
 * serving the last good page instead of replacing it with the fallback.
 */
export async function getGalleryPhotos(
  slug: string,
  fallback: Photo[],
  phase: GalleryPhase = galleryPhase(),
): Promise<Photo[]> {
  if (!getOptionalSupabase()) return fallback;

  try {
    const stored = await unstable_cache(
      async () => {
        const client = getOptionalSupabase();
        return client ? readGalleryRow(client, slug) : null;
      },
      ["gallery", slug],
      { tags: [galleryTag(slug)], revalidate: GALLERY_REVALIDATE_SECONDS },
    )();
    return stored?.photos ?? fallback;
  } catch (error) {
    if (phase === "production") throw error;
    console.error(
      "gallery: read failed, showing the repo photos",
      error instanceof Error ? error.message : "unknown error",
    );
    return fallback;
  }
}
