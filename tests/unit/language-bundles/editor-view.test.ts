import { describe, expect, it } from "vitest";

import {
  alphabetPreview,
  issueTarget,
} from "@/lib/language-bundles/editor-view";
import type { BundleIssue } from "@/lib/language-bundles/validate";

import { testBundle, testEntry } from "./fixtures";

const issue = (overrides: Partial<BundleIssue>): BundleIssue => ({
  code: "unverified",
  message: "PRUEBA",
  ...overrides,
});

describe("issueTarget", () => {
  it("sends each problem to the tab and row where it is fixed", () => {
    expect(issueTarget(issue({ entryId: "pato" }))).toEqual({
      tab: "palabras",
      anchor: "palabra-pato",
    });
    expect(
      issueTarget(issue({ code: "theme_not_playable", themeId: "t" })),
    ).toEqual({ tab: "juegos", anchor: "tema-t" });
    expect(issueTarget(issue({ code: "empty_alphabet" }))?.tab).toBe(
      "alfabeto",
    );
    expect(issueTarget(issue({ code: "duplicate_id" }))?.tab).toBe("fuentes");
    expect(issueTarget(issue({ code: "too_large" }))).toBeNull();
  });

  it("prefers the word when a problem names a word and a theme", () => {
    expect(
      issueTarget(issue({ code: "missing_emoji", entryId: "e", themeId: "t" }))
        ?.tab,
    ).toBe("palabras");
  });
});

// AC-L4-4
describe("alphabetPreview", () => {
  const bundle = testBundle({
    entries: [
      testEntry({ id: "a", word: "chino" }),
      testEntry({ id: "b", word: "pato" }),
      testEntry({ id: "c", word: "pino" }),
      testEntry({ id: "d", word: "zeta" }),
      testEntry({ id: "e", word: "mesa" }),
    ],
    themes: [],
  });

  it("groups the words by their first letter, in the alphabet's order", () => {
    const preview = alphabetPreview(bundle);
    expect(preview.groups.map((group) => group.letter)).toEqual([
      "P",
      "Ch",
      "M",
    ]);
    expect(preview.groups[0]).toEqual({
      letter: "P",
      words: ["pato", "pino"],
      total: 2,
    });
    expect(preview.outside).toEqual(["zeta"]);
  });

  it("follows a reordered alphabet", () => {
    const reordered = testBundle({
      ...bundle,
      alphabet: {
        ...bundle.alphabet,
        graphemes: ["m", "ch", "p", "a", "e", "i", "o", "t", "s", "n"],
      },
    });
    expect(
      alphabetPreview(reordered).groups.map((group) => group.letter),
    ).toEqual(["M", "Ch", "P"]);
  });

  it("caps the words shown per letter but keeps the count", () => {
    expect(alphabetPreview(bundle, 1).groups[0]).toEqual({
      letter: "P",
      words: ["pato"],
      total: 2,
    });
  });
});
