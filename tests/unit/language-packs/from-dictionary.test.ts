import { describe, expect, it } from "vitest";

import dictionary from "@/data/dictionary/ashaninka.json";
import sourcesFile from "@/data/dictionary/sources.json";
import picturesFile from "@/data/word-jump/ashaninka-pictures.json";
import { ASHANINKA_ALPHABET } from "@/lib/dictionary/collation";
import type { Dictionary, Source } from "@/lib/dictionary/types";
import { draftAshaninkaPack } from "@/lib/language-packs/from-dictionary";
import { playableThemes } from "@/lib/language-packs/playable";
import { parsePack } from "@/lib/language-packs/schema";
import { validatePack } from "@/lib/language-packs/validate";

const entries = (dictionary as Dictionary).entries;
const sources = sourcesFile.sources as Source[];
const { pictures } = picturesFile;
// The pack has no audio, so the bucket URL never comes into play.
const options = {
  language: "ashaninka",
  audioBaseUrl: "https://example.invalid/storage/v1/object/public/audio",
};

const themeOf = (pack: ReturnType<typeof draftAshaninkaPack>, mode: string) =>
  pack.themes.find((theme) => theme.mode === mode);

describe("draftAshaninkaPack", () => {
  it("is a valid pack with no blocking errors", () => {
    const pack = draftAshaninkaPack(dictionary as Dictionary, sources, {
      pictures,
    });
    expect(parsePack(pack).ok).toBe(true);
    expect(validatePack(pack, options).errors).toEqual([]);
  });

  it("leaves every word unverified unless told otherwise", () => {
    const pack = draftAshaninkaPack(dictionary as Dictionary, sources, {
      pictures,
    });
    const items = pack.themes.flatMap((theme) => theme.items);
    expect(items.every((item) => item.verified === false)).toBe(true);
    expect(playableThemes(pack)).toEqual([]);
  });

  it("marks every word verified when the team decided so, and is then playable", () => {
    const pack = draftAshaninkaPack(dictionary as Dictionary, sources, {
      pictures,
      verified: true,
    });
    const items = pack.themes.flatMap((theme) => theme.items);
    expect(items.every((item) => item.verified === true)).toBe(true);
    expect(playableThemes(pack).map((theme) => theme.mode)).toEqual([
      "pic2word",
      "word2pic",
      "first",
      "vowel",
    ]);
  });

  it("puts every entry, nouns and verbs, in the letter themes", () => {
    const pack = draftAshaninkaPack(dictionary as Dictionary, sources);
    for (const mode of ["first", "vowel"]) {
      const theme = themeOf(pack, mode);
      expect(theme?.items.map((item) => item.word)).toEqual(
        entries.map((entry) => entry.word),
      );
    }
    themeOf(pack, "first")?.items.forEach((item, index) => {
      expect(item.translation).toBe(entries[index].translations[0]);
    });
  });

  it("puts only the pictured entries, each with its emoji, in the picture themes", () => {
    const pack = draftAshaninkaPack(dictionary as Dictionary, sources, {
      pictures,
    });
    const expected = new Map(pictures.map((p) => [p.id, p.emoji]));
    for (const mode of ["pic2word", "word2pic"]) {
      const items = themeOf(pack, mode)?.items ?? [];
      expect(items).toHaveLength(pictures.length);
      expect(items.every((item) => item.emoji === expected.get(item.id))).toBe(
        true,
      );
    }
  });

  it("has a dictionary entry and a distinct emoji for every picture", () => {
    const ids = new Set(entries.map((entry) => entry.id));
    expect(pictures.filter((picture) => !ids.has(picture.id))).toEqual([]);
    expect(new Set(pictures.map((picture) => picture.emoji)).size).toBe(
      pictures.length,
    );
  });

  it("has no picture themes when no pictures are given", () => {
    const pack = draftAshaninkaPack(dictionary as Dictionary, sources);
    expect(pack.themes.map((theme) => theme.mode)).toEqual(["first", "vowel"]);
  });

  it("cites the dictionary source on every item", () => {
    const pack = draftAshaninkaPack(dictionary as Dictionary, sources, {
      pictures,
    });
    const sourceIds = new Set(pack.sources.map((source) => source.id));
    const items = pack.themes.flatMap((theme) => theme.items);
    expect(items.every((item) => sourceIds.has(item.sourceId ?? ""))).toBe(
      true,
    );
  });

  it("takes the letters and vowels from the official alphabet", () => {
    const pack = draftAshaninkaPack(dictionary as Dictionary, sources);
    expect(pack.language.graphemes).toEqual([...ASHANINKA_ALPHABET]);
    const alphabet: readonly string[] = ASHANINKA_ALPHABET;
    expect(
      pack.language.vowels.every((vowel) => alphabet.includes(vowel)),
    ).toBe(true);
  });
});
