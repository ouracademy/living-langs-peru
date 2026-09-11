import { type LanguageSlug, languages } from "@/lib/languages";

import { PLACEHOLDER_SOURCE_ID } from "./constants";
import { dictionaries, sources } from "./registry";
import { getComparator, getInitial } from "./collation";
import { normalize } from "./text";
import type { Dictionary, Entry, Source } from "./types";

export type { Dictionary, Entry, Example, PartOfSpeech, Source } from "./types";
export { PLACEHOLDER_SOURCE_ID } from "./constants";

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

/**
 * ISO 639-3 codes, used for the `lang` attribute so screen readers do not
 * read entries and example sentences as Spanish. Partial on purpose: a
 * language whose code we have not confirmed gets no lang attribute rather
 * than a guessed one.
 */
const LANGUAGE_CODES: Partial<Record<LanguageSlug, string>> = {
  ashaninka: "cni",
};

export function getLanguageCode(language: string): string | undefined {
  const byLanguage: Record<string, string | undefined> = LANGUAGE_CODES;

  return byLanguage[language];
}

/** Group that collects entries starting with a digit or a symbol. */
const OTHER_LETTER = "#";

export type LetterGroup = {
  letter: string;
  entries: Entry[];
};

/**
 * Splits entries into one section per initial letter of the language's own
 * alphabet, so an Asháninka digraph gets its own section ("Ch", not "C").
 * Accented initials fold into their base letter, and anything not starting
 * with a letter lands in a trailing "#".
 *
 * Only sections that actually have entries are returned.
 */
export function groupByLetter(
  entries: Entry[],
  language?: string,
): LetterGroup[] {
  const compare = getComparator(language);
  const byLetter = new Map<string, Entry[]>();

  for (const item of entries) {
    const letter = getInitial(item.word, language) ?? OTHER_LETTER;
    const group = byLetter.get(letter);

    if (group) {
      group.push(item);
    } else {
      byLetter.set(letter, [item]);
    }
  }

  return [...byLetter.entries()]
    .sort(([a], [b]) => {
      if (a === OTHER_LETTER) return 1;
      if (b === OTHER_LETTER) return -1;

      return compare(a, b);
    })
    .map(([letter, group]) => ({
      letter,
      entries: group.sort((a, b) => compare(a.word, b.word)),
    }));
}

/**
 * Ranking levels, best first. Search is deliberately bidirectional: typing
 * "casa" must find the entry whose translation is «casa», not just entries
 * whose headword starts with those letters.
 */
const NO_MATCH = Number.MAX_SAFE_INTEGER;

function rank(entry: Entry, query: string): number {
  const forms = [entry.word, ...(entry.variants ?? [])].map(normalize);

  if (forms.some((form) => form === query)) return 1;
  if (forms.some((form) => form.startsWith(query))) return 2;
  if (forms.some((form) => form.includes(query))) return 3;

  const translations = entry.translations.map(normalize);

  if (translations.some((text) => text.startsWith(query))) return 4;
  if (translations.some((text) => text.includes(query))) return 5;

  return NO_MATCH;
}

/**
 * Filters and orders entries for a query. An empty query returns everything,
 * alphabetically. Ties within a ranking level break alphabetically too, so
 * the order is stable and predictable.
 */
export function searchEntries(
  entries: Entry[],
  query: string,
  language?: string,
): Entry[] {
  const compare = getComparator(language);
  const wanted = normalize(query);

  if (!wanted) {
    return [...entries].sort((a, b) => compare(a.word, b.word));
  }

  return entries
    .map((entry) => ({ entry, rank: rank(entry, wanted) }))
    .filter((scored) => scored.rank !== NO_MATCH)
    .sort((a, b) => a.rank - b.rank || compare(a.entry.word, b.entry.word))
    .map((scored) => scored.entry);
}

/** Every cited work, for the attribution shown on the page. */
export function getSources(): Source[] {
  return sources;
}

export function getSource(sourceId: string | undefined): Source | undefined {
  return sourceId
    ? sources.find((source) => source.id === sourceId)
    : undefined;
}
