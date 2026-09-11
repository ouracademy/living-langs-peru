import type { LanguageSlug } from "@/lib/languages";

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "interjection"
  | "phrase";

export type Example = {
  /** The sentence in the indigenous language. */
  sentence: string;
  /** Its Spanish translation. */
  translation: string;
  sourceId?: string;
};

export type Entry = {
  /** URL-safe slug, unique within a language. Equals slugify(word). */
  id: string;
  /** Canonical written form. */
  word: string;
  /** Alternative spellings, also searchable. */
  variants?: string[];
  /** At least one, in Spanish. */
  translations: string[];
  partOfSpeech?: PartOfSpeech;
  examples: Example[];
  notes?: string;
  sourceId?: string;
};

export type Dictionary = {
  language: LanguageSlug;
  entries: Entry[];
};

export type Source = {
  id: string;
  title: string;
  publisher: string;
  year: number;
  authors?: string[];
  url: string;
  note?: string;
};
