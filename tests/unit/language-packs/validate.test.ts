import { describe, expect, it } from "vitest";

import { MAX_PACK_BYTES, validatePack } from "@/lib/language-packs/validate";

import { testItem, testPack, testTheme } from "./fixtures";

const audioBaseUrl =
  "https://prueba.supabase.co/storage/v1/object/public/audio";

function codes(issues: { code: string }[]): string[] {
  return issues.map((issue) => issue.code);
}

describe("validatePack", () => {
  it("finds nothing wrong with the test pack", () => {
    expect(validatePack(testPack(), { audioBaseUrl })).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it("rejects a language that is not in languages.ts", () => {
    const base = testPack();
    const pack = testPack({ language: { ...base.language, slug: "klingon" } });

    expect(codes(validatePack(pack, { audioBaseUrl }).errors)).toEqual([
      "unknown_language",
    ]);
  });

  it("rejects a pack for another language than the one being edited", () => {
    expect(
      codes(validatePack(testPack(), { audioBaseUrl, language: "uro" }).errors),
    ).toEqual(["language_mismatch"]);
  });

  it("rejects a source id that does not exist, naming theme and item", () => {
    const pack = testPack({
      themes: [testTheme({ items: [testItem({ sourceId: "no-existe" })] })],
    });

    expect(validatePack(pack, { audioBaseUrl }).errors).toEqual([
      expect.objectContaining({
        code: "unknown_source",
        themeId: "tema-prueba",
        itemId: "item-uno",
      }),
    ]);
  });

  // AC-SP1-7
  it("rejects audio as a data: URI or outside the project's bucket", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            testItem({ audio: "data:audio/webm;base64,AAAA" }),
            testItem({
              id: "item-otro-dominio",
              word: "PRUEBA dos",
              audio: "https://otro.ejemplo/audio/x.webm",
            }),
            testItem({
              id: "item-bien",
              word: "PRUEBA tres",
              audio: `${audioBaseUrl}/ashaninka/x.webm`,
            }),
          ],
        }),
      ],
    });

    const errors = validatePack(pack, { audioBaseUrl }).errors;

    expect(errors.map((issue) => [issue.code, issue.itemId])).toEqual([
      ["audio_outside_bucket", "item-uno"],
      ["audio_outside_bucket", "item-otro-dominio"],
    ]);
  });

  it("does not accept a bucket URL that only starts like the right one", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: [testItem({ audio: `${audioBaseUrl}-falso/x.webm` })],
        }),
      ],
    });

    expect(codes(validatePack(pack, { audioBaseUrl }).errors)).toEqual([
      "audio_outside_bucket",
    ]);
  });

  it("rejects two items of a theme with the same normalised word", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            ...testTheme().items,
            testItem({ id: "item-repetido", word: " prueba UNO " }),
          ],
        }),
      ],
    });

    expect(validatePack(pack, { audioBaseUrl }).errors).toEqual([
      expect.objectContaining({
        code: "duplicate_word",
        itemId: "item-repetido",
      }),
    ]);
  });

  it("rejects a pack of 2 MB or more", () => {
    const pack = testPack({
      language: {
        ...testPack().language,
        about: { notes: "x".repeat(MAX_PACK_BYTES) },
      },
    });

    expect(codes(validatePack(pack, { audioBaseUrl }).errors)).toContain(
      "pack_too_large",
    );
  });

  it("warns, without blocking, about what keeps an item or theme out of the game", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            ...testTheme().items,
            testItem({
              id: "sin-emoji",
              word: "PRUEBA cinco",
              emoji: undefined,
            }),
            testItem({
              id: "sin-verificar",
              word: "PRUEBA seis",
              verified: false,
            }),
          ],
        }),
        testTheme({
          id: "tema-inicial",
          mode: "first",
          items: [testItem({ id: "inicial-rara", word: "zPRUEBA" })],
        }),
        testTheme({
          id: "tema-vocal",
          mode: "vowel",
          items: [testItem({ id: "sin-vocal", word: "prb" })],
        }),
      ],
    });

    const { errors, warnings } = validatePack(pack, { audioBaseUrl });

    expect(errors).toEqual([]);
    expect(
      warnings.map((issue) => [issue.code, issue.itemId ?? issue.themeId]),
    ).toEqual([
      ["missing_emoji", "sin-emoji"],
      ["unverified", "sin-verificar"],
      ["initial_not_in_graphemes", "inicial-rara"],
      ["theme_not_playable", "tema-inicial"],
      ["no_vowel", "sin-vocal"],
      ["theme_not_playable", "tema-vocal"],
    ]);
  });

  it("writes every message in Spanish and every code in English", () => {
    const pack = testPack({
      themes: [testTheme({ items: [testItem({ sourceId: "no-existe" })] })],
    });

    const [issue] = validatePack(pack, { audioBaseUrl }).errors;

    expect(issue.code).toMatch(/^[a-z_]+$/);
    expect(issue.message).toMatch(/fuente/);
  });
});
