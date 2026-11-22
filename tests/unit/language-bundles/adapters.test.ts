import { describe, expect, it } from "vitest";

import oldDictionary from "@/data/dictionary/ashaninka.json";
import oldSources from "@/data/dictionary/sources.json";
import { ASHANINKA_ALPHABET } from "@/lib/dictionary/collation";
import {
  bundleToDictionary,
  bundleToPack,
  verifiedEntries,
} from "@/lib/language-bundles/adapters";
import { repoBundle } from "@/lib/language-bundles/fallback";
import { playableThemes } from "@/lib/language-packs/playable";

import { testBundle, testEntry } from "./fixtures";

describe("bundleToDictionary", () => {
  // AC-L3-1: the asháninka bundle gives back exactly the dictionary it came from.
  it("turns the repo's asháninka bundle into the same dictionary as before", () => {
    const bundle = repoBundle("ashaninka");
    expect(bundle).not.toBeNull();
    const content = bundleToDictionary(bundle!);

    const strip = (entry: object) => JSON.parse(JSON.stringify(entry));
    const before = oldDictionary.entries.map((entry) => ({
      ...strip(entry),
      // An example citing its own entry's source is the same either way.
      examples: entry.examples.map(({ sentence, translation }) => ({
        sentence,
        translation,
      })),
    }));
    const after = content.dictionary.entries.map((entry) => ({
      ...strip(entry),
      examples: entry.examples.map(({ sentence, translation }) => ({
        sentence,
        translation,
      })),
    }));

    expect(after).toEqual(before);
    expect(content.sources).toEqual(oldSources.sources);
    expect(content.alphabet).toEqual([...ASHANINKA_ALPHABET]);
  });

  // AC-L3-2
  it("leaves unverified entries out", () => {
    const bundle = testBundle({
      entries: [
        testEntry(),
        testEntry({ id: "oculta", word: "PRUEBA oculta", verified: false }),
      ],
    });

    const { dictionary } = bundleToDictionary(bundle);

    expect(dictionary.entries.map((entry) => entry.id)).toEqual(["prueba-uno"]);
    expect(verifiedEntries(bundle)).toHaveLength(1);
  });

  it("only lists the sources its verified entries cite", () => {
    const bundle = testBundle({
      sources: [
        ...testBundle().sources,
        { id: "otra", kind: "speaker", title: "Persona de PRUEBA" },
      ],
    });

    expect(
      bundleToDictionary(bundle).sources.map((source) => source.id),
    ).toEqual(["fuente-prueba"]);
  });
});

describe("bundleToPack", () => {
  it("resolves themes to their entries and keeps the letter rules", () => {
    const pack = bundleToPack(testBundle(), { name: "Uro", isoCode: "" });

    expect(pack.language).toMatchObject({
      slug: "uro",
      name: "Uro",
      title: "Saltapalabras en uro",
      graphemes: testBundle().alphabet.graphemes,
      vowels: testBundle().alphabet.vowels,
    });
    expect(pack.themes[0].items.map((item) => item.word)).toEqual([
      "pato",
      "mesa",
      "pino",
    ]);
    expect(pack.themes[0].items[0].translation).toBe("PRUEBA uno");
  });

  it("is playable through the same gate as a pack, without unverified words", () => {
    const bundle = testBundle({
      entries: [
        ...testBundle().entries,
        testEntry({ id: "oculta", word: "tos", emoji: "🤧", verified: false }),
      ],
      themes: [
        {
          ...testBundle().themes[0],
          entryIds: ["prueba-uno", "prueba-dos", "prueba-tres", "oculta"],
        },
      ],
    });

    const [theme] = playableThemes(
      bundleToPack(bundle, { name: "Uro", isoCode: "" }),
    );

    expect(theme.items.map((item) => item.id)).not.toContain("oculta");
  });

  it("carries the voice settings and skips references to missing entries", () => {
    const pack = bundleToPack(
      testBundle({
        speech: { lang: "es-PE", quality: "approx" },
        themes: [
          { ...testBundle().themes[0], entryIds: ["prueba-uno", "nada"] },
        ],
      }),
      { name: "Uro", isoCode: "" },
    );

    expect(pack.language.tts).toEqual({ lang: "es-PE", quality: "approx" });
    expect(pack.themes[0].items).toHaveLength(1);
  });
});
