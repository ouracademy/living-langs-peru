import * as babel from "prettier/plugins/babel";
import * as estree from "prettier/plugins/estree";
import { format } from "prettier/standalone";

import type { People, Photo, PhotoCredit } from "@/lib/peoples";
import { validatePeople } from "@/lib/peoples/validate";

import { MAX_GALLERY_PHOTOS } from "./photo-fields";

/**
 * What a save does to the people file, as pure functions: the route reads the
 * file from GitHub, applies one action, validates the whole result and only
 * then commits (spec #9). Nothing here touches the network.
 */

/** Where gallery photos live, as `Photo.src` writes it (under `public/`). */
export const GALLERY_PHOTO_DIR = "/peoples/ashaninka";

/** A file this feature is allowed to delete: one level inside the folder. */
const DELETABLE_SRC = /^\/peoples\/ashaninka\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

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
      /** Repository path of the file to delete in the same commit (remove). */
      deletedFile?: string;
    }
  | { ok: false; error: GalleryActionError; problems: string[] };

function failure(error: GalleryActionError, problem: string): ApplyResult {
  return { ok: false, error, problems: [problem] };
}

const NOT_FOUND = "Esa foto ya no está en la galería.";

function next(
  people: People,
  photos: Photo[],
  deletedFile?: string,
): ApplyResult {
  const candidate: People = { ...people, photos };
  // The whole file, not just the photo touched: the same rules as peoples:check.
  const problems = validatePeople(candidate);
  if (problems.length > 0)
    return { ok: false, error: "photo_invalid", problems };
  return deletedFile
    ? { ok: true, people: candidate, deletedFile }
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
    case "remove": {
      // Never let a crafted src turn «remove» into deleting another file.
      if (!DELETABLE_SRC.test(target.src)) {
        return failure(
          "photo_invalid",
          "Esa foto no está en la carpeta de la galería.",
        );
      }
      return next(
        people,
        photos.filter((_, i) => i !== index),
        `public${target.src}`,
      );
    }
  }
}

/**
 * The file exactly as Prettier would leave it (decision #14), so the editor's
 * commit keeps `format:check` green. Indenting first matters: Prettier keeps an
 * object expanded when its source is, which is how the repository writes them.
 */
export async function serializePeople(people: People): Promise<string> {
  return format(JSON.stringify(people, null, 2), {
    parser: "json",
    plugins: [babel, estree],
  });
}

const SUFFIX = /^[a-z0-9]{6}$/;

/**
 * `<yyyy-mm-dd>-<6 random characters>.jpg` (spec §6.2). The editor's file
 * name never reaches the repository; the caller supplies the random part so
 * this stays pure.
 */
export function newPhotoName(now: Date, suffix: string): string {
  if (!SUFFIX.test(suffix)) {
    throw new RangeError("suffix must be 6 characters of [a-z0-9]");
  }
  return `${now.toISOString().slice(0, 10)}-${suffix}.jpg`;
}

const ACTION_LABELS: Record<GalleryActionType, string> = {
  add: "add photo",
  edit: "edit photo",
  move: "move photo",
  remove: "remove photo",
};

/** Conventional Commits, checked against commitlint in a test (plan §3.11). */
export function commitMessageFor(action: GalleryActionType): string {
  return `chore: update ashaninka gallery (${ACTION_LABELS[action]})`;
}
