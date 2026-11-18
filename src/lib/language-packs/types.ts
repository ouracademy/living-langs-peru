/**
 * A language pack: everything one language needs to be played (spec §4.1).
 * It is the unit that is imported, published, versioned and validated.
 */

export const PACK_SCHEMA = "language-pack/1";

export const GAME_MODES = [
  "pic2word",
  "listen",
  "word2pic",
  "first",
  "vowel",
] as const;

export type GameMode = (typeof GAME_MODES)[number];

export type LanguagePack = {
  schema: typeof PACK_SCHEMA;
  language: {
    /** Key in src/lib/languages.ts and primary key in the database. */
    slug: string;
    /** ISO 639-3, for the `lang` attribute (`cni`, `aym`). */
    isoCode: string;
    name: string;
    title: string;
    about?: {
      region?: string;
      family?: string;
      speakers?: string;
      notes?: string;
    };
    /** Used by the `vowel` mode. */
    vowels: string[];
    /** Accented or variant spellings folded onto a vowel: { "á": "a" }. */
    vowelVariants?: Record<string, string>;
    /** Longest-match tokenisation for the `first` mode; digraphs included. */
    graphemes: string[];
    /** Preferred distractors for a grapheme: { "ts": ["ch", "s"] }. */
    confusable?: Record<string, string[]>;
    /** Label for the translation language, e.g. "castellano". */
    translationLabel: string;
    /** Short phrases in the language, reviewed as part of publishing. */
    praise?: { correct?: string; wrong?: string; win?: string };
  };
  sources: PackSource[];
  themes: Theme[];
};

export type PackSource = {
  id: string;
  kind: "publication" | "speaker";
  /** A publication title, or how a consenting speaker wants to be credited. */
  title: string;
  url?: string;
  note?: string;
};

export type Theme = {
  id: string;
  name: string;
  nameNative?: string;
  icon: string;
  mode: GameMode;
  items: PackItem[];
};

/**
 * What reading the published pack can give (spec §6.4). An error is not one of
 * them: a failed read throws, so a failed revalidation never replaces a good
 * page with «not available» (decision #8).
 */
export type PackReadResult =
  | { status: "unconfigured" }
  | { status: "none" }
  | { status: "ok"; pack: LanguagePack; version: number; publishedAt: string };

export type PackItem = {
  /**
   * Stable across edits, so progress survives a corrected spelling. Empty only
   * between `parsePack` and `cleanPack`, which assigns one.
   */
  id: string;
  word: string;
  translation: string;
  emoji?: string;
  /** Must resolve to `sources[].id` for the item to be playable. */
  sourceId?: string;
  /** Page or entry inside the source: "p. 112". */
  sourceRef?: string;
  /** Set by the team member who checked it. Unverified items are never played (decision #4). */
  verified: boolean;
  /** Public URL inside the project's `audio` bucket. Never a data: URI. */
  audio?: string;
};
