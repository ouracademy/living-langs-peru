import { type LanguageSlug, languages } from "@/lib/languages";

import { dictionaries } from "./registry";
import { normalize } from "./text";
import type { Dictionary, Entry } from "./types";

export type { Dictionary, Entry, Example, PartOfSpeech } from "./types";

/**
 * Marks scaffolding content that is not real language data. Entries carrying
 * it must never reach production: `dictionary:check` rejects them.
 */
export const PLACEHOLDER_SOURCE_ID = "placeholder";

/**
 * A language may exist in `languages.ts` without having a dictionary yet, so
 * availability is derived from the data file rather than from a flag.
 */
export function getDictionary(language: string): Dictionary | null {
  const byLanguage: Record<string, Dictionary> = dictionaries;

  return byLanguage[language] ?? null;
}

/** True while any entry still carries placeholder content. */
export function isProvisional(dictionary: Dictionary): boolean {
  return dictionary.entries.some(
    (entry) => entry.sourceId === PLACEHOLDER_SOURCE_ID,
  );
}

/** The languages that actually have a dictionary, with their entry counts. */
export function getLanguagesWithDictionary(): {
  slug: LanguageSlug;
  name: string;
  total: number;
}[] {
  return languages.flatMap((language) => {
    const dictionary = getDictionary(language.slug);

    return dictionary
      ? [
          {
            slug: language.slug,
            name: language.name,
            total: dictionary.entries.length,
          },
        ]
      : [];
  });
}

/**
 * Finds the entry a ?palabra value refers to. Tries the exact id first, then
 * the word and its variants folded for case and diacritics, so a hand-typed
 * link works as well as a generated one.
 */
export function resolveWord(
  entries: Entry[],
  value: string,
): Entry | undefined {
  const wanted = normalize(value);

  if (!wanted) return undefined;

  const byId = entries.find((entry) => entry.id === value.trim());

  if (byId) return byId;

  return entries.find(
    (entry) =>
      normalize(entry.word) === wanted ||
      entry.variants?.some((variant) => normalize(variant) === wanted),
  );
}
