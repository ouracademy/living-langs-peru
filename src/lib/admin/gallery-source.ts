import type { SupabaseClient } from "@supabase/supabase-js";

import { ashaninka, type Photo } from "@/lib/peoples";
import { readGalleryRow } from "@/lib/peoples/gallery-store";

import { GALLERY_SLUG } from "./gallery";

export type GalleryErrorCode =
  "supabase_not_configured" | "gallery_unavailable";

export type GallerySnapshot = {
  photos: Photo[];
  /** Version the photos were read at; a save sends it back (spec #11). */
  version: number;
};

export type GalleryResult =
  { ok: true; value: GallerySnapshot } | { ok: false; error: GalleryErrorCode };

/** Spanish copy for each failure. Never the raw Supabase error. */
export const GALLERY_ERROR_MESSAGES: Record<GalleryErrorCode, string> = {
  supabase_not_configured:
    "La edición no está disponible: falta configurar Supabase en este servidor. Avisa al equipo técnico.",
  gallery_unavailable:
    "No pudimos leer la galería. Intenta de nuevo en unos minutos.",
};

/** The repo's photos: what the gallery starts from before its first save. */
export const STARTING_PHOTOS: Photo[] = ashaninka.photos;

/**
 * The gallery as stored right now, uncached (spec #10). With no row yet, the
 * repo's photos at version 0: the first save creates the row from them.
 */
export async function readGallery(
  client: SupabaseClient | null,
): Promise<GalleryResult> {
  if (!client) return { ok: false, error: "supabase_not_configured" };
  try {
    const stored = await readGalleryRow(client, GALLERY_SLUG);
    return {
      ok: true,
      value: stored ?? { photos: STARTING_PHOTOS, version: 0 },
    };
  } catch (error) {
    console.error(
      "admin/fotos: read failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return { ok: false, error: "gallery_unavailable" };
  }
}
