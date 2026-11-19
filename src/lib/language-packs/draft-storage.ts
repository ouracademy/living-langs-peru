import { parsePack } from "./schema.ts";
import type { LanguagePack } from "./types.ts";

/**
 * The pack in preparation lives only in the browser (spec §9.1): in memory
 * while working, with a copy in localStorage in case the tab closes
 * (AC-SP6-13). These functions take the storage as an argument so they stay
 * testable and never touch `window` themselves.
 */

/** The parts of Storage this needs; `null` when the browser offers none. */
export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function draftKey(language: string): string {
  return `living-langs:pack-admin:v1:${language}`;
}

/** The raw saved text, or `null`. Never throws: a blocked storage is «nothing saved». */
export function readDraftText(
  storage: DraftStorage | null,
  language: string,
): string | null {
  try {
    return storage?.getItem(draftKey(language)) ?? null;
  } catch {
    return null;
  }
}

/** A saved text back into a pack. Anything that does not validate is ignored. */
export function draftFromText(text: string | null): LanguagePack | null {
  if (text === null) return null;
  try {
    const parsed = parsePack(JSON.parse(text));
    return parsed.ok ? parsed.pack : null;
  } catch {
    return null;
  }
}

/** Saves the copy. `false` when the browser refused it (quota, private mode). */
export function writeDraft(
  storage: DraftStorage | null,
  language: string,
  pack: LanguagePack,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(draftKey(language), JSON.stringify(pack));
    return true;
  } catch {
    return false;
  }
}

/** «Descartar»: forgets the copy. Returns whether the storage agreed. */
export function clearDraft(
  storage: DraftStorage | null,
  language: string,
): boolean {
  if (!storage) return true;
  try {
    storage.removeItem(draftKey(language));
    return true;
  } catch {
    return false;
  }
}
