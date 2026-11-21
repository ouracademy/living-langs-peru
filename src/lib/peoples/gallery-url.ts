/**
 * Where gallery photos live in Supabase Storage (spec edicion-fotos #2, #19).
 * No imports on purpose: next.config.ts loads this file, where the "@/" alias
 * does not resolve.
 */

export const GALLERY_BUCKET = "gallery";

const PUBLIC_PATH = `/storage/v1/object/public/${GALLERY_BUCKET}`;

/** A file name the server generated: `<yyyy-mm-dd>-<6 chars>.jpg` and the like. */
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * The origin of `SUPABASE_URL`, or null when it is missing or not a URL. Only
 * the origin: a URL pasted with `/rest/v1/` behind it still points to the
 * right place.
 */
export function supabaseOrigin(supabaseUrl: string | undefined): URL | null {
  const raw = supabaseUrl?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}

/** `https://<project>.supabase.co/storage/v1/object/public/gallery`, or null. */
export function galleryPublicBase(
  supabaseUrl: string | undefined,
): string | null {
  const origin = supabaseOrigin(supabaseUrl);
  return origin ? `${origin.origin}${PUBLIC_PATH}` : null;
}

/** The bucket path of a gallery's new photo: `ashaninka/<file>`. */
export function galleryObjectPath(slug: string, fileName: string): string {
  if (!FILE_NAME.test(fileName)) {
    throw new RangeError("not a generated file name");
  }
  return `${slug}/${fileName}`;
}

/**
 * The bucket path behind a photo's `src`, if the photo was uploaded to this
 * gallery's folder; null for anything else (a photo in `public/`, another
 * folder, another host). Removing a photo only ever deletes what this returns.
 */
export function galleryObjectPathOf(
  src: string,
  slug: string,
  supabaseUrl: string | undefined,
): string | null {
  const base = galleryPublicBase(supabaseUrl);
  const prefix = base ? `${base}/${slug}/` : null;
  if (!prefix || !src.startsWith(prefix)) return null;
  const fileName = src.slice(prefix.length);
  return FILE_NAME.test(fileName) ? `${slug}/${fileName}` : null;
}

/** The one `images.remotePatterns` entry the gallery needs (decision #19). */
export function galleryRemotePattern(supabaseUrl: string | undefined): {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: string;
} | null {
  const origin = supabaseOrigin(supabaseUrl);
  if (!origin) return null;
  return {
    protocol: origin.protocol === "http:" ? "http" : "https",
    hostname: origin.hostname,
    port: origin.port,
    pathname: `${PUBLIC_PATH}/**`,
  };
}
