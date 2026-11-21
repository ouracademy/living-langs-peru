import { ASHANINKA_ALPHABET } from "../dictionary/collation.ts";
import type { Dictionary, Entry, Source } from "../dictionary/types.ts";
import { PACK_SCHEMA, type LanguagePack, type PackItem } from "./types.ts";

/** The four vowels of the official alphabet (see `ASHANINKA_ALPHABET`). */
const ASHANINKA_VOWELS = ["a", "e", "i", "o"];

/** An emoji for one dictionary entry, by entry id. */
export type EntryPicture = { id: string; emoji: string };

export type DraftOptions = {
  /** Emoji for the entries that can be pictured; the rest get none. */
  pictures?: EntryPicture[];
  /**
   * Marks every word as verified. Only for a decision a person took and
   * recorded (spec decision #4): the default leaves every word unverified.
   */
  verified?: boolean;
};

/**
 * An Asháninka pack built only from cited data already in the repo: the MINEDU
 * 2021 vocabulary and the official alphabet. Nothing in Asháninka is written by
 * hand. Every entry goes to the first-letter and missing-vowel themes; the ones
 * with a picture also go to the picture themes.
 */
export function draftAshaninkaPack(
  dictionary: Dictionary,
  sources: Source[],
  options: DraftOptions = {},
): LanguagePack {
  const verified = options.verified === true;
  const emojiById = new Map(
    (options.pictures ?? []).map((picture) => [picture.id, picture.emoji]),
  );
  const entries = dictionary.entries.filter(
    (entry) => entry.translations.length > 0,
  );
  const usedSourceIds = new Set(
    entries.flatMap((entry) => (entry.sourceId ? [entry.sourceId] : [])),
  );

  const toItem = (entry: Entry): PackItem => {
    const emoji = emojiById.get(entry.id);
    return {
      id: entry.id,
      word: entry.word,
      translation: entry.translations[0],
      ...(emoji ? { emoji } : {}),
      ...(entry.sourceId
        ? { sourceId: entry.sourceId, sourceRef: `entrada «${entry.word}»` }
        : {}),
      verified,
    };
  };

  const allItems = entries.map(toItem);
  const pictured = allItems.filter((item) => item.emoji);

  return {
    schema: PACK_SCHEMA,
    language: {
      slug: "ashaninka",
      isoCode: "cni",
      name: "Asháninka",
      title: "Saltapalabras en asháninka",
      vowels: ASHANINKA_VOWELS,
      graphemes: [...ASHANINKA_ALPHABET],
      translationLabel: "castellano",
    },
    sources: sources
      .filter((source) => usedSourceIds.has(source.id))
      .map((source) => ({
        id: source.id,
        kind: "publication",
        title: `${source.title} (${source.publisher}, ${source.year})`,
        url: source.url,
      })),
    themes: [
      ...(pictured.length > 0
        ? [
            {
              id: "dibujo-palabra",
              name: "Dibujo → palabra",
              icon: "🖼️",
              mode: "pic2word" as const,
              items: pictured,
            },
            {
              id: "palabra-dibujo",
              name: "Palabra → dibujo",
              icon: "🔎",
              mode: "word2pic" as const,
              items: pictured,
            },
          ]
        : []),
      {
        id: "letra-inicial",
        name: "Letra inicial",
        icon: "🔤",
        mode: "first",
        items: allItems,
      },
      {
        id: "vocal-que-falta",
        name: "Vocal que falta",
        icon: "🅰️",
        mode: "vowel",
        items: allItems,
      },
    ],
  };
}
