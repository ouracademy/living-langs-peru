import { dictionaries } from "./registry";
import type { Dictionary } from "./types";

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
