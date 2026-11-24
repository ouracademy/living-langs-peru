import { describe, expect, it } from "vitest";

import {
  bundleToDictionary,
  bundleToPack,
  verifiedEntries,
} from "@/lib/language-bundles/adapters";
import { repoBundle } from "@/lib/language-bundles/fallback";
import { playableThemes } from "@/lib/language-packs/playable";

import { testBundle, testEntry } from "./fixtures";

describe("bundleToDictionary", () => {
  // AC-L3-1. The fixed dictionary JSON it was exported from was retired in F4;
  // what stays checkable is that every verified entry comes through intact.
  it("turns the repo's asháninka bundle into the dictionary it carries", () => {
    const bundle = repoBundle("ashaninka");
    expect(bundle).not.toBeNull();
    const content = bundleToDictionary(bundle!);

    const verified = bundle!.entries.filter((entry) => entry.verified);
    expect(content.dictionary.language).toBe("ashaninka");
    expect(
      content.dictionary.entries.map(
        ({ id, word, translations, sourceId }) => ({
          id,
          word,
          translations,
          sourceId,
        }),
      ),
    ).toEqual(
      verified.map(({ id, word, translations, sourceId }) => ({
        id,
        word,
        translations,
        sourceId,
      })),
    );
    expect(content.sources.map((source) => source.id)).toEqual([
      "minedu-2021-vocabulario-pedagogico",
    ]);
    // The official alphabet, as src/lib/dictionary/collation.ts carried it
    // until F4.
    expect(content.alphabet).toEqual([
      "a",
      "b",
      "ch",
      "e",
      "i",
      "j",
      "k",
      "m",
      "n",
      "ñ",
      "o",
      "p",
      "r",
      "s",
      "sh",
      "t",
      "ts",
      "ty",
      "y",
    ]);
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
