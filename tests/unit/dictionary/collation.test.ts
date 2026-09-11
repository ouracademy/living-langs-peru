import { describe, expect, it } from "vitest";

import {
  ASHANINKA_ALPHABET,
  getComparator,
  getInitial,
  tokenizeWord,
} from "@/lib/dictionary/collation";

describe("ASHANINKA_ALPHABET", () => {
  // RD 0606-2008-ED / RM 303-2015-MINEDU: 19 letters, 4 vowels + 15 consonants.
  it("has the 19 official letters in order", () => {
    expect(ASHANINKA_ALPHABET).toEqual([
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
});

describe("tokenizeWord", () => {
  it("reads digraphs as single letters, longest first", () => {
    expect(tokenizeWord("ashaninka", "ashaninka")).toEqual([
      "a",
      "sh",
      "a",
      "n",
      "i",
      "n",
      "k",
      "a",
    ]);
    expect(tokenizeWord("chakopibenki", "ashaninka")).toEqual([
      "ch",
      "a",
      "k",
      "o",
      "p",
      "i",
      "b",
      "e",
      "n",
      "k",
      "i",
    ]);
    expect(tokenizeWord("tsaparipaye", "ashaninka")).toEqual([
      "ts",
      "a",
      "p",
      "a",
      "r",
      "i",
      "p",
      "a",
      "y",
      "e",
    ]);
  });

  it("does not split ty into t and y", () => {
    expect(tokenizeWord("tyapapanko", "ashaninka")).toEqual([
      "ty",
      "a",
      "p",
      "a",
      "p",
      "a",
      "n",
      "k",
      "o",
    ]);
  });

  it("keeps a letter that is not in the alphabet as its own token", () => {
    expect(tokenizeWord("la", "ashaninka")).toEqual(["l", "a"]);
  });
});

describe("getComparator('ashaninka')", () => {
  const compare = getComparator("ashaninka");

  // The behaviour that differs from Spanish: sh is a letter after s, so every
  // plain-s word sorts before every sh word. Spanish would put "sha" first,
  // comparing h against i.
  it("sorts sh after every plain s word", () => {
    expect(compare("si", "sha")).toBeLessThan(0);
    expect(compare("sha", "si")).toBeGreaterThan(0);
  });

  it("sorts ch between b and e, as its own letter", () => {
    expect(compare("ba", "cha")).toBeLessThan(0);
    expect(compare("cha", "ea")).toBeLessThan(0);
  });

  it("sorts t before ts before ty", () => {
    expect(compare("ta", "tsa")).toBeLessThan(0);
    expect(compare("tsa", "tya")).toBeLessThan(0);
  });

  it("sorts ñ after n and before o", () => {
    expect(compare("na", "ña")).toBeLessThan(0);
    expect(compare("ña", "oa")).toBeLessThan(0);
  });

  it("puts y last among the letters", () => {
    for (const letter of ASHANINKA_ALPHABET.slice(0, -1)) {
      expect(compare(`${letter}a`, "ya")).toBeLessThan(0);
    }
  });

  it("sorts a letter outside the alphabet after every official letter", () => {
    expect(compare("ya", "la")).toBeLessThan(0);
  });

  it("treats identical words as equal", () => {
    expect(compare("noshaninka", "noshaninka")).toBe(0);
  });

  it("sorts a prefix before the longer word", () => {
    expect(compare("sha", "shatsi")).toBeLessThan(0);
  });

  it("orders a real word list per the official alphabet", () => {
    const sorted = [
      "tyapa",
      "sheri",
      "seri",
      "ñaa",
      "noa",
      "chakopi",
      "aa",
    ].sort(compare);

    expect(sorted).toEqual([
      "aa",
      "chakopi",
      "noa",
      "ñaa",
      "seri",
      "sheri",
      "tyapa",
    ]);
  });
});

describe("getComparator() without a language", () => {
  const compare = getComparator();

  // Falls back to Spanish so other languages keep working unchanged.
  it("uses Spanish rules, where sh is just s followed by h", () => {
    expect(compare("sha", "si")).toBeLessThan(0);
  });

  it("still ignores accents", () => {
    expect(compare("arbol", "árbol")).toBe(0);
  });
});

describe("getInitial", () => {
  it("returns a digraph as the section letter, capitalised", () => {
    expect(getInitial("chakopibenki", "ashaninka")).toBe("Ch");
    expect(getInitial("sheri", "ashaninka")).toBe("Sh");
    expect(getInitial("tsaparipaye", "ashaninka")).toBe("Ts");
    expect(getInitial("tyapapanko", "ashaninka")).toBe("Ty");
  });

  it("returns a single letter uppercased", () => {
    expect(getInitial("ashaninka", "ashaninka")).toBe("A");
    expect(getInitial("ñaa", "ashaninka")).toBe("Ñ");
  });

  it("returns null when the word does not start with a letter", () => {
    expect(getInitial("1uno", "ashaninka")).toBeNull();
    expect(getInitial("-guion", "ashaninka")).toBeNull();
    expect(getInitial("", "ashaninka")).toBeNull();
  });

  it("does not invent a digraph for a language with no alphabet table", () => {
    expect(getInitial("chakopibenki")).toBe("C");
  });
});
