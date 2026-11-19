import { ASHANINKA_ALPHABET } from "../dictionary/collation.ts";
import type { Dictionary, Source } from "../dictionary/types.ts";
import { PACK_SCHEMA, type LanguagePack, type PackItem } from "./types.ts";

/** The four vowels of the official alphabet (see `ASHANINKA_ALPHABET`). */
const ASHANINKA_VOWELS = ["a", "e", "i", "o"];

/**
 * A first Asháninka pack built only from cited data already in the repo: the
 * nouns of the MINEDU 2021 vocabulary and the official alphabet. Nothing is
 * written by hand and **every item is `verified: false`**: marking a word as
 * verified is a person's decision (spec decision #4), never this function's.
 *
 * Only the two modes that need no picture are filled. `pic2word` and
 * `word2pic` need an emoji per word, which the team chooses.
 */
export function draftAshaninkaPack(
  dictionary: Dictionary,
  sources: Source[],
): LanguagePack {
  const nouns = dictionary.entries.filter(
    (entry) => entry.partOfSpeech === "noun" && entry.translations.length > 0,
  );
  const usedSourceIds = new Set(
    nouns.flatMap((entry) => (entry.sourceId ? [entry.sourceId] : [])),
  );

  const items: PackItem[] = nouns.map((entry) => ({
    id: entry.id,
    word: entry.word,
    translation: entry.translations[0],
    ...(entry.sourceId
      ? { sourceId: entry.sourceId, sourceRef: `entrada «${entry.word}»` }
      : {}),
    verified: false,
  }));

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
      {
        id: "letra-inicial",
        name: "Letra inicial",
        icon: "🔤",
        mode: "first",
        items,
      },
      {
        id: "vocal-que-falta",
        name: "Vocal que falta",
        icon: "🅰️",
        mode: "vowel",
        items,
      },
    ],
  };
}
