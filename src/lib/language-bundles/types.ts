/**
 * A language bundle (spec gestor-lenguas §4): all the dictionary and game
 * content of one language, in one JSON document. The normative reference is
 * docs/gestor-lenguas/language-bundle.schema.json; `parseBundle` accepts and
 * rejects exactly what that schema does.
 */
export const BUNDLE_SCHEMA = "language-bundle/1";

/** The fixed universe of the site (spec decision #1). */
export const BUNDLE_LANGUAGES = ["ashaninka", "uro"] as const;
export type BundleLanguage = (typeof BUNDLE_LANGUAGES)[number];

export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "interjection",
  "phrase",
] as const;

export const THEME_MODES = [
  "pic2word",
  "listen",
  "word2pic",
  "first",
  "vowel",
] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export type BundleSource = {
  id: string;
  kind: "publication" | "speaker";
  title: string;
  publisher?: string;
  year?: number;
  authors?: string[];
  url?: string;
  license?: string;
  note?: string;
};

export type BundleExample = {
  sentence: string;
  translation: string;
  sourceId?: string;
};

export type BundleEntry = {
  /** Stable: survives a corrected spelling, so progress and themes keep it. */
  id: string;
  word: string;
  variants?: string[];
  /** The first one is what the games show. */
  translations: string[];
  partOfSpeech?: (typeof PARTS_OF_SPEECH)[number];
  examples?: BundleExample[];
  notes?: string;
  emoji?: string;
  audio?: string;
  sourceId: string;
  sourceRef?: string;
  /** Only verified entries reach a public page (spec decision #8). */
  verified: boolean;
  verifiedBy?: string;
};

export type BundleTheme = {
  id: string;
  name: string;
  icon: string;
  mode: ThemeMode;
  /** References into `entries`, never copies (spec decision #3). */
  entryIds: string[];
};

export type BundleAlphabet = {
  /** In order; a digraph is one grapheme. */
  graphemes: string[];
  vowels: string[];
  vowelVariants?: Record<string, string>;
  confusable?: Record<string, string[]>;
  sourceId?: string;
};

export type BundleSpeech = {
  lang: string;
  quality: "approx" | "off";
  replace?: [string, string][];
};

export type LanguageBundle = {
  schema: typeof BUNDLE_SCHEMA;
  language: BundleLanguage;
  translationLabel: string;
  alphabet: BundleAlphabet;
  speech?: BundleSpeech;
  sources: BundleSource[];
  entries: BundleEntry[];
  themes: BundleTheme[];
};

/**
 * What reading a language's bundle can give (spec §6). `origin` says where it
 * came from: the published row, or the repo's fallback (decision #6).
 */
export type BundleReadResult =
  | { status: "none" }
  | {
      status: "ok";
      bundle: LanguageBundle;
      version: number;
      publishedAt: string | null;
      origin: "supabase" | "repo";
    };
