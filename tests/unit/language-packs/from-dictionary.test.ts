import { describe, expect, it } from "vitest";

import dictionary from "@/data/dictionary/ashaninka.json";
import sourcesFile from "@/data/dictionary/sources.json";
import { ASHANINKA_ALPHABET } from "@/lib/dictionary/collation";
import type { Dictionary, Source } from "@/lib/dictionary/types";
import { draftAshaninkaPack } from "@/lib/language-packs/from-dictionary";
import { parsePack } from "@/lib/language-packs/schema";
import { validatePack } from "@/lib/language-packs/validate";

const pack = draftAshaninkaPack(
  dictionary as Dictionary,
  sourcesFile.sources as Source[],
);
const allItems = pack.themes.flatMap((theme) => theme.items);

describe("draftAshaninkaPack", () => {
  it("is a valid pack with no blocking errors", () => {
    expect(parsePack(pack).ok).toBe(true);
    // The draft has no audio, so the bucket URL never comes into play.
    const options = {
      language: "ashaninka",
      audioBaseUrl: "https://example.invalid/storage/v1/object/public/audio",
    };
    expect(validatePack(pack, options).errors).toEqual([]);
  });

  it("never marks a word as verified", () => {
    expect(allItems.length).toBeGreaterThan(0);
    expect(allItems.every((item) => item.verified === false)).toBe(true);
  });

  it("uses only the dictionary's nouns, with their word and first translation", () => {
    const nouns = (dictionary as Dictionary).entries.filter(
      (entry) => entry.partOfSpeech === "noun",
    );
    const [firstTheme] = pack.themes;
    expect(firstTheme.items).toHaveLength(nouns.length);
    firstTheme.items.forEach((item, index) => {
      expect(item.word).toBe(nouns[index].word);
      expect(item.translation).toBe(nouns[index].translations[0]);
    });
  });

  it("cites the dictionary source on every item", () => {
    const sourceIds = new Set(pack.sources.map((source) => source.id));
    expect(allItems.every((item) => sourceIds.has(item.sourceId ?? ""))).toBe(
      true,
    );
  });

  it("takes the letters and vowels from the official alphabet", () => {
    expect(pack.language.graphemes).toEqual([...ASHANINKA_ALPHABET]);
    const alphabet: readonly string[] = ASHANINKA_ALPHABET;
    expect(
      pack.language.vowels.every((vowel) => alphabet.includes(vowel)),
    ).toBe(true);
  });

  it("only fills the modes that need no picture", () => {
    expect(pack.themes.map((theme) => theme.mode)).toEqual(["first", "vowel"]);
    expect(allItems.some((item) => item.emoji)).toBe(false);
  });
});
