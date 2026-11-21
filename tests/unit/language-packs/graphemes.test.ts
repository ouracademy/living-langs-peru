import { describe, expect, it } from "vitest";

import {
  initialGrapheme,
  tokenizeGraphemes,
  vowelSlots,
} from "@/lib/language-packs/graphemes";

describe("tokenizeGraphemes", () => {
  // AC-SP1-8
  it("matches the longest grapheme first", () => {
    expect(tokenizeGraphemes("tsitsi", ["ts", "t", "s", "i"])).toEqual([
      "ts",
      "i",
      "ts",
      "i",
    ]);
  });

  it("keeps what is not in the list as one-character tokens", () => {
    expect(tokenizeGraphemes("prueba-1", ["p", "r"])).toEqual([
      "p",
      "r",
      "u",
      "e",
      "b",
      "a",
      "-",
      "1",
    ]);
  });

  it("matches regardless of case and keeps the original spelling", () => {
    expect(tokenizeGraphemes("PRUEBA", ["pr", "u"])).toEqual([
      "PR",
      "U",
      "E",
      "B",
      "A",
    ]);
  });

  // AC-SP1-9
  it("treats a composed and a decomposed accent as the same letter", () => {
    const decomposed = "pá";
    expect(tokenizeGraphemes(decomposed, ["p", "á"])).toEqual(["p", "á"]);
  });

  it("keeps a character outside the BMP whole", () => {
    expect(tokenizeGraphemes("a🍎", ["a"])).toEqual(["a", "🍎"]);
  });

  it("returns nothing for an empty word", () => {
    expect(tokenizeGraphemes("", ["a"])).toEqual([]);
  });
});

describe("initialGrapheme", () => {
  it("is the first token, normalised, when it is a grapheme of the language", () => {
    expect(initialGrapheme("TSprueba", ["ts", "t", "p"])).toBe("ts");
  });

  it("is null when the initial is not in the list", () => {
    expect(initialGrapheme("prueba", ["a", "e"])).toBeNull();
  });
});

describe("vowelSlots", () => {
  const rules = {
    vowels: ["a", "e", "i", "o"],
    vowelVariants: { á: "a" },
    graphemes: ["p", "r", "b"],
  };

  it("finds every vowel, folding variants (AC-SP2-5)", () => {
    expect(vowelSlots("prábe", rules)).toEqual({
      tokens: ["p", "r", "á", "b", "e"],
      slots: [
        { index: 2, vowel: "a" },
        { index: 4, vowel: "e" },
      ],
    });
  });

  it("finds no slot in a word without vowels", () => {
    expect(vowelSlots("prb", rules).slots).toEqual([]);
  });
});
