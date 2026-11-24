import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseBundle } from "@/lib/language-bundles/schema";
import { validateBundle } from "@/lib/language-bundles/validate";

import { testBundle, testEntry } from "./fixtures";

const codes = (issues: { code: string }[]) => issues.map((issue) => issue.code);

describe("validateBundle", () => {
  it("finds nothing wrong in a clean bundle", () => {
    expect(validateBundle(testBundle(), { language: "uro" })).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it("has no errors on the asháninka example", () => {
    const parsed = parseBundle(
      JSON.parse(
        readFileSync(
          join(process.cwd(), "src/data/bundles/ashaninka.json"),
          "utf8",
        ),
      ),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(
        validateBundle(parsed.bundle, { language: "ashaninka" }).errors,
      ).toEqual([]);
    }
  });

  // AC-L1-1
  it("refuses a theme that points to a missing entry and an unknown source", () => {
    const bundle = testBundle({
      entries: [
        ...testBundle().entries,
        testEntry({ id: "prueba-cuatro", word: "tos", sourceId: "no-existe" }),
      ],
      themes: [{ ...testBundle().themes[0], entryIds: ["prueba-uno", "nada"] }],
    });

    const { errors } = validateBundle(bundle);

    expect(codes(errors)).toEqual(["unknown_source", "unknown_entry"]);
    expect(errors[0].entryId).toBe("prueba-cuatro");
    expect(errors[1].themeId).toBe("tema-prueba");
  });

  it("refuses repeated ids, another language and audio outside the bucket", () => {
    const bundle = testBundle({
      entries: [testEntry(), testEntry({ audio: "https://otro.org/a.mp3" })],
      themes: [],
    });

    const { errors } = validateBundle(bundle, {
      language: "ashaninka",
      audioBaseUrl: "https://p.supabase.co/storage/v1/object/public/audio",
    });

    expect(codes(errors)).toEqual([
      "language_mismatch",
      "duplicate_id",
      "audio_outside_bucket",
    ]);
  });

  it("refuses a bundle of 2 MB or more", () => {
    const long = "PRUEBA ".repeat(400_000);
    const bundle = testBundle({
      entries: [testEntry({ notes: long })],
    });
    expect(codes(validateBundle(bundle).errors)).toContain("too_large");
  });

  // AC-L1-2
  it("warns, without refusing, about a letter outside the alphabet", () => {
    const bundle = testBundle({
      entries: [
        ...testBundle().entries,
        testEntry({ id: "prueba-x", word: "Xeno" }),
      ],
    });

    const { errors, warnings } = validateBundle(bundle);

    expect(errors).toEqual([]);
    const warning = warnings.find(
      (issue) => issue.code === "letter_outside_alphabet",
    );
    expect(warning?.entryId).toBe("prueba-x");
    expect(warning?.message).toContain("x");
  });

  it("warns about unverified words, repeated words and missing pictures", () => {
    const bundle = testBundle({
      entries: [
        testEntry(),
        testEntry({ id: "prueba-dos", word: "PATO", verified: false }),
        testEntry({ id: "prueba-tres", word: "mesa", emoji: undefined }),
      ],
      themes: [
        {
          ...testBundle().themes[0],
          entryIds: ["prueba-uno", "prueba-dos", "prueba-tres"],
        },
      ],
    });

    const found = codes(validateBundle(bundle).warnings);

    expect(found).toContain("unverified");
    expect(found).toContain("duplicate_word");
    expect(found).toContain("missing_emoji");
    // Two verified words with pictures are not enough to play.
    expect(found).toContain("theme_not_playable");
  });

  it("warns about a vowel outside the alphabet and an unknown example source", () => {
    const bundle = testBundle({
      alphabet: { ...testBundle().alphabet, vowels: ["a", "u"] },
      entries: [
        testEntry({
          examples: [{ sentence: "pato", translation: "x", sourceId: "nada" }],
        }),
      ],
      themes: [],
    });

    const found = codes(validateBundle(bundle).warnings);

    expect(found).toEqual(["vowel_outside_alphabet", "unknown_example_source"]);
  });
});
