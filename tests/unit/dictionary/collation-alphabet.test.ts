import { describe, expect, it } from "vitest";

import {
  ASHANINKA_ALPHABET,
  getComparator,
  getInitial,
  tokenizeWord,
} from "@/lib/dictionary/collation";

// Spec gestor-lenguas #10: the alphabet comes with the content, as data.

describe("collation with the alphabet as data", () => {
  it("sorts by the given graphemes exactly as by the asháninka slug", () => {
    const words = ["tsitok", "tinik", "chakopi", "kiribiro", "abakerone"];
    const bySlug = [...words].sort(getComparator("ashaninka"));
    const byData = [...words].sort(getComparator([...ASHANINKA_ALPHABET]));

    expect(byData).toEqual(bySlug);
  });

  it("follows any order it is given, digraphs included", () => {
    const alphabet = ["t", "ch", "a", "o", "p"];

    expect(["pato", "chopa", "tapa"].sort(getComparator(alphabet))).toEqual([
      "tapa",
      "chopa",
      "pato",
    ]);
    expect(tokenizeWord("chopa", alphabet)).toEqual(["ch", "o", "p", "a"]);
    expect(getInitial("chopa", alphabet)).toBe("Ch");
  });

  it("falls back to Spanish collation for an empty alphabet", () => {
    expect(["b", "á", "a"].sort(getComparator([]))).toEqual(["á", "a", "b"]);
  });
});
