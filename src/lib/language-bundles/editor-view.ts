import { getComparator, getInitial } from "../dictionary/collation.ts";

import type { LanguageBundle } from "./types.ts";
import type { BundleIssue } from "./validate.ts";

/** The tabs of /admin/lenguas/[lengua] (spec gestor-lenguas §5). */
export const EDITOR_TABS = [
  { id: "palabras", label: "Palabras" },
  { id: "juegos", label: "Juegos" },
  { id: "alfabeto", label: "Alfabeto" },
  { id: "fuentes", label: "Fuentes" },
] as const;

export type EditorTab = (typeof EDITOR_TABS)[number]["id"];

export type IssueTarget = { tab: EditorTab; anchor: string };

export const entryAnchor = (id: string) => `palabra-${id}`;
export const themeAnchor = (id: string) => `tema-${id}`;
export const ALPHABET_ANCHOR = "alfabeto-letras";
export const SOURCES_ANCHOR = "fuentes-lista";

/**
 * Where an error or a warning is fixed: the word, the theme, the alphabet or
 * the sources. Null when it concerns the whole file (size, language).
 */
export function issueTarget(issue: BundleIssue): IssueTarget | null {
  if (issue.entryId) {
    return { tab: "palabras", anchor: entryAnchor(issue.entryId) };
  }
  if (issue.themeId) {
    return { tab: "juegos", anchor: themeAnchor(issue.themeId) };
  }
  if (
    issue.code === "empty_alphabet" ||
    issue.code === "vowel_outside_alphabet"
  ) {
    return { tab: "alfabeto", anchor: ALPHABET_ANCHOR };
  }
  if (issue.code === "duplicate_id" || issue.code === "unknown_source") {
    return { tab: "fuentes", anchor: SOURCES_ANCHOR };
  }
  return null;
}

export type LetterGroup = { letter: string; words: string[]; total: number };

export type AlphabetPreview = {
  groups: LetterGroup[];
  /** Words that do not start with a letter of the alphabet. */
  outside: string[];
};

/**
 * How the dictionary will order the words with this alphabet: grouped by
 * their first letter, a few words per letter (AC-L4-4).
 */
export function alphabetPreview(
  bundle: LanguageBundle,
  perLetter = 4,
): AlphabetPreview {
  const graphemes = bundle.alphabet.graphemes;
  const known = new Set(graphemes.map((grapheme) => grapheme.toLowerCase()));
  const words = bundle.entries
    .map((entry) => entry.word)
    .sort(getComparator(graphemes));

  const groups = new Map<string, string[]>();
  const outside: string[] = [];
  for (const word of words) {
    const initial = getInitial(word, graphemes);
    if (!initial || !known.has(initial.toLowerCase())) {
      outside.push(word);
      continue;
    }
    const list = groups.get(initial) ?? [];
    list.push(word);
    groups.set(initial, list);
  }

  return {
    groups: [...groups].map(([letter, list]) => ({
      letter,
      words: list.slice(0, perLetter),
      total: list.length,
    })),
    outside,
  };
}
