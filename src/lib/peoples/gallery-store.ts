import type { SupabaseClient } from "@supabase/supabase-js";

import type { Photo } from "./types";
import { GALLERY_BUCKET } from "./gallery-url";

/**
 * The gallery in Supabase (spec edicion-fotos #2, #3, #11): one row per
 * gallery in `galleries`, saved whole through `save_gallery`, and the photo
 * files in the `gallery` bucket. Only the server calls this, with the secret
 * key; the client is passed in so tests can stand in for it.
 */

export type StoredGallery = { photos: Photo[]; version: number };

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isSize = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** Enough of `Photo` to render it; the full rules run on every save. */
function isPhoto(value: unknown): value is Photo {
  if (typeof value !== "object" || value === null) return false;
  const photo = value as Record<string, unknown>;
  const credit = photo.credit as Record<string, unknown> | null | undefined;
  return (
    isText(photo.src) &&
    isSize(photo.width) &&
    isSize(photo.height) &&
    isText(photo.alt) &&
    typeof credit === "object" &&
    credit !== null &&
    isText(credit.author) &&
    isText(credit.license) &&
    (credit.url === undefined || isText(credit.url)) &&
    (photo.caption === undefined || typeof photo.caption === "string")
  );
}

function errorCode(error: unknown): string {
  return (error as { code?: string } | null)?.code ?? "unknown";
}

/**
 * The stored gallery, or null when it has no row yet. Throws on an error or a
 * malformed row instead of answering null: a cached read that throws keeps
 * the last good page (spec #16), while a null would replace it.
 */
export async function readGalleryRow(
  client: SupabaseClient,
  slug: string,
): Promise<StoredGallery | null> {
  const { data, error } = await client
    .from("galleries")
    .select("version, photos")
    .eq("slug", slug)
    .maybeSingle();

  // Only the code: the message can quote the row.
  if (error) throw new Error(`galleries read failed (${errorCode(error)})`);
  if (!data) return null;

  const { version, photos } = data as { version: unknown; photos: unknown };
  if (
    typeof version !== "number" ||
    !Array.isArray(photos) ||
    !photos.every(isPhoto)
  ) {
    throw new Error("galleries returned a malformed row");
  }
  return { version, photos };
}

export type SaveGalleryResult =
  | { ok: true; version: number }
  | { ok: false; error: "version_conflict" | "gallery_unavailable" };

/** Saves the whole list if nobody saved since `expectedVersion` (spec #11). */
export async function saveGalleryRow(
  client: SupabaseClient,
  slug: string,
  photos: Photo[],
  expectedVersion: number,
): Promise<SaveGalleryResult> {
  const { data, error } = await client.rpc("save_gallery", {
    p_slug: slug,
    p_photos: photos,
    p_expected_version: expectedVersion,
  });
  if (error) {
    const code = errorCode(error);
    if (code === "40001") return { ok: false, error: "version_conflict" };
    console.error("gallery: save failed", code);
    return { ok: false, error: "gallery_unavailable" };
  }
  if (typeof data !== "number") {
    console.error("gallery: save answered without a version");
    return { ok: false, error: "gallery_unavailable" };
  }
  return { ok: true, version: data };
}

/** Uploads a reduced JPEG. Never overwrites: every name is new. */
export async function uploadGalleryPhoto(
  client: SupabaseClient,
  path: string,
  bytes: Uint8Array,
): Promise<boolean> {
  const { error } = await client.storage
    .from(GALLERY_BUCKET)
    .upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: false,
      // The name never changes content, so browsers and the CDN may keep it.
      cacheControl: "31536000",
    });
  if (error) {
    console.error("gallery: upload failed", errorCode(error));
    return false;
  }
  return true;
}

/** Deletes one file of the bucket. A failure leaves an unused file, logged. */
export async function deleteGalleryPhoto(
  client: SupabaseClient,
  path: string,
): Promise<boolean> {
  const { error } = await client.storage.from(GALLERY_BUCKET).remove([path]);
  if (error) {
    console.error("gallery: delete failed", errorCode(error));
    return false;
  }
  return true;
}
