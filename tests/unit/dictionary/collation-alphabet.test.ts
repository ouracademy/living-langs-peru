import { describe, expect, it } from "vitest";

import {
  getComparator,
  getInitial,
  tokenizeWord,
} from "@/lib/dictionary/collation";

import { ASHANINKA_ALPHABET } from "./ashaninka-bundle";

// Spec gestor-lenguas #10: the alphabet comes with the content, as data.

describe("collation with the alphabet as data", () => {
  it("sorts asháninka words by the alphabet its bundle carries", () => {
    const words = ["tsitok", "tinik", "chakopi", "kiribiro", "abakerone"];
    // «ch» and «ts» are letters of their own, in the official order.
    expect([...words].sort(getComparator(ASHANINKA_ALPHABET))).toEqual([
      "abakerone",
      "chakopi",
      "kiribiro",
      "tinik",
      "tsitok",
    ]);
  });

  it("falls back to Spanish collation without an alphabet, or with an empty one", () => {
    const words = ["ñaa", "chakopi", "abakerone"];
    expect([...words].sort(getComparator())).toEqual([
      "abakerone",
      "chakopi",
      "ñaa",
    ]);
    expect([...words].sort(getComparator([]))).toEqual([
      "abakerone",
      "chakopi",
      "ñaa",
    ]);
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
