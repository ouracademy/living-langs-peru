import { parseBundle } from "./schema.ts";
import type { LanguageBundle } from "./types.ts";

/**
 * The working copy of a language bundle lives only in the browser (spec
 * gestor-lenguas decision #12): in memory while working, with a copy in
 * localStorage in case the tab closes. These functions take the storage as an
 * argument, so they stay testable and never touch `window` themselves.
 */

/** The parts of Storage this needs; `null` when the browser offers none. */
export type BundleDraftStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export const BUNDLE_DRAFT_PREFIX = "living-langs:bundle-admin:v1:";

export function bundleDraftKey(language: string): string {
  return `${BUNDLE_DRAFT_PREFIX}${language}`;
}

/** The raw saved text, or `null`. Never throws: a blocked storage is «nothing saved». */
export function readBundleDraftText(
  storage: BundleDraftStorage | null,
  language: string,
): string | null {
  try {
    return storage?.getItem(bundleDraftKey(language)) ?? null;
  } catch {
    return null;
  }
}

/** A saved text back into a bundle. Anything that does not parse is ignored. */
export function bundleDraftFromText(
  text: string | null,
): LanguageBundle | null {
  if (text === null) return null;
  try {
    const parsed = parseBundle(JSON.parse(text));
    return parsed.ok ? parsed.bundle : null;
  } catch {
    return null;
  }
}

/** Saves the copy. `false` when the browser refused it (quota, private mode). */
export function writeBundleDraft(
  storage: BundleDraftStorage | null,
  language: string,
  bundle: LanguageBundle,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(bundleDraftKey(language), JSON.stringify(bundle));
    return true;
  } catch {
    return false;
  }
}

/** «Descartar»: forgets the copy. Returns whether the storage agreed. */
export function clearBundleDraft(
  storage: BundleDraftStorage | null,
  language: string,
): boolean {
  if (!storage) return true;
  try {
    storage.removeItem(bundleDraftKey(language));
    return true;
  } catch {
    return false;
  }
}
