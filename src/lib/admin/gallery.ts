import type { People, Photo, PhotoCredit } from "@/lib/peoples";
import { validatePeople } from "@/lib/peoples/validate";

import { MAX_GALLERY_PHOTOS } from "./photo-fields";

/**
 * What a save does to the gallery, as pure functions: the route reads the
 * stored list, applies one action, validates the whole result and only then
 * saves it (spec #9). Nothing here touches the network.
 */

/** The only gallery editable today (spec P3). */
export const GALLERY_SLUG = "ashaninka";

export type GalleryAction =
  | { type: "add"; photo: Photo }
  /** Texts and credit only: the file, its size and its place never change. */
  | {
      type: "edit";
      src: string;
      alt: string;
      caption?: string;
      credit: PhotoCredit;
    }
  | { type: "move"; src: string; direction: "up" | "down" }
  | { type: "remove"; src: string };

export type GalleryActionType = GalleryAction["type"];

export type GalleryActionError =
  "photo_invalid" | "gallery_full" | "photo_not_found";

export type ApplyResult =
  | {
      ok: true;
      people: People;
      /** The photo taken out (remove): the route deletes its file if it has one. */
      removed?: Photo;
    }
  | { ok: false; error: GalleryActionError; problems: string[] };

function failure(error: GalleryActionError, problem: string): ApplyResult {
  return { ok: false, error, problems: [problem] };
}

const NOT_FOUND = "Esa foto ya no está en la galería.";

function next(people: People, photos: Photo[], removed?: Photo): ApplyResult {
  const candidate: People = { ...people, photos };
  // The whole people, not just the photo touched: the same rules as peoples:check.
  const problems = validatePeople(candidate);
  if (problems.length > 0)
    return { ok: false, error: "photo_invalid", problems };
  return removed
    ? { ok: true, people: candidate, removed }
    : { ok: true, people: candidate };
}

export function applyAction(
  people: People,
  action: GalleryAction,
): ApplyResult {
  const photos = people.photos;

  if (action.type === "add") {
    if (photos.length >= MAX_GALLERY_PHOTOS) {
      return failure(
        "gallery_full",
        `La galería ya tiene ${MAX_GALLERY_PHOTOS} fotos.`,
      );
    }
    if (photos.some((photo) => photo.src === action.photo.src)) {
      return failure(
        "photo_invalid",
        `Ya hay una foto en ${action.photo.src}.`,
      );
    }
    return next(people, [...photos, action.photo]);
  }

  const index = photos.findIndex((photo) => photo.src === action.src);
  if (index === -1) return failure("photo_not_found", NOT_FOUND);
  const target = photos[index];

  switch (action.type) {
    case "edit": {
      const edited: Photo = {
        src: target.src,
        width: target.width,
        height: target.height,
        alt: action.alt,
        ...(action.caption ? { caption: action.caption } : {}),
        credit: action.credit,
      };
      return next(
        people,
        photos.map((photo, i) => (i === index ? edited : photo)),
      );
    }
    case "move": {
      const other = action.direction === "up" ? index - 1 : index + 1;
      if (other < 0 || other >= photos.length) {
        return failure(
          "photo_invalid",
          action.direction === "up"
            ? "Ya es la primera foto."
            : "Ya es la última foto.",
        );
      }
      const reordered = [...photos];
      [reordered[index], reordered[other]] = [
        reordered[other],
        reordered[index],
      ];
      return next(people, reordered);
    }
    case "remove":
      return next(
        people,
        photos.filter((_, i) => i !== index),
        target,
      );
  }
}

const SUFFIX = /^[a-z0-9]{6}$/;

/**
 * `<yyyy-mm-dd>-<6 random characters>.jpg` (spec §6.2). The editor's file
 * name never reaches the bucket; the caller supplies the random part so this
 * stays pure.
 */
export function newPhotoName(now: Date, suffix: string): string {
  if (!SUFFIX.test(suffix)) {
    throw new RangeError("suffix must be 6 characters of [a-z0-9]");
  }
  return `${now.toISOString().slice(0, 10)}-${suffix}.jpg`;
}
