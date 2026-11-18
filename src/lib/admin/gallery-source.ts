import type { Photo } from "@/lib/peoples";

import {
  type FetchLike,
  type GitHubConfig,
  type GitHubErrorCode,
  readRepoFile,
} from "./github";

/** The only gallery editable today (spec P3): the code takes the path, not the people. */
export const GALLERY_FILE = "src/data/peoples/ashaninka.json";

export type GalleryErrorCode =
  GitHubErrorCode | "github_not_configured" | "gallery_unreadable";

export type GallerySnapshot = {
  photos: Photo[];
  /** Commit the photos were read at; a save sends it back (spec #11). */
  sha: string;
};

export type GalleryResult =
  { ok: true; value: GallerySnapshot } | { ok: false; error: GalleryErrorCode };

/** Spanish copy for each failure. Never the raw GitHub error. */
export const GALLERY_ERROR_MESSAGES: Record<GalleryErrorCode, string> = {
  github_unauthorized:
    "La edición no está disponible. Avisa al equipo técnico.",
  github_not_configured:
    "La edición no está disponible. Avisa al equipo técnico.",
  github_unavailable:
    "No pudimos leer la galería. Intenta de nuevo en unos minutos.",
  gallery_unreadable: "No pudimos leer la galería. Avisa al equipo técnico.",
};

function photosOf(content: string): Photo[] | null {
  try {
    const data: unknown = JSON.parse(content);
    if (typeof data !== "object" || data === null || !("photos" in data)) {
      return null;
    }
    const photos = (data as { photos: unknown }).photos;
    return Array.isArray(photos) ? (photos as Photo[]) : null;
  } catch {
    return null;
  }
}

export async function readGallery(
  config: GitHubConfig | null,
  fetchImpl: FetchLike,
): Promise<GalleryResult> {
  if (!config) return { ok: false, error: "github_not_configured" };

  const file = await readRepoFile(config, GALLERY_FILE, fetchImpl);
  if (!file.ok) return file;

  const photos = photosOf(file.value.content);
  if (!photos) return { ok: false, error: "gallery_unreadable" };

  return { ok: true, value: { photos, sha: file.value.commitSha } };
}
