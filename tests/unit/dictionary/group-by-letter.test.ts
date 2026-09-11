import { describe, expect, it } from "vitest";

import { groupByLetter } from "@/lib/dictionary";

import { entry } from "./fixtures";

const letters = (words: string[]) =>
  groupByLetter(words.map((word) => entry({ word }))).map(
    (group) => group.letter,
  );

describe("groupByLetter", () => {
  // AC-M1-3
  it("groups accented initials with their base letter", () => {
    expect(letters(["arbol", "árbol2", "avion"])).toEqual(["A"]);
  });

  it("keeps Ñ as its own group, between N and O", () => {
    expect(letters(["napa", "ñuu", "oro"])).toEqual(["N", "Ñ", "O"]);
  });

  it("never returns an empty group", () => {
    const groups = groupByLetter([entry({ word: "casa" })]);

    expect(groups).toHaveLength(1);
    for (const group of groups) {
      expect(group.entries.length).toBeGreaterThan(0);
    }
  });

  it("puts digits and symbols in a trailing # group", () => {
    expect(letters(["zeta", "1uno", "-guion", "alfa"])).toEqual([
      "A",
      "Z",
      "#",
    ]);
  });

  it("sorts entries alphabetically within a group", () => {
    const [group] = groupByLetter([
      entry({ word: "avion" }),
      entry({ word: "arbol" }),
    ]);

    expect(group.entries.map((item) => item.word)).toEqual(["arbol", "avion"]);
  });

  it("uppercases the group letter", () => {
    expect(letters(["casa"])).toEqual(["C"]);
  });

  it("returns nothing for no entries", () => {
    expect(groupByLetter([])).toEqual([]);
  });

  it("keeps every entry exactly once", () => {
    const words = ["napa", "ñuu", "oro", "1uno", "arbol"];
    const groups = groupByLetter(words.map((word) => entry({ word })));
    const flattened = groups.flatMap((group) => group.entries);

    expect(flattened).toHaveLength(words.length);
  });
});

describe("groupByLetter for Asháninka", () => {
  const letters = (words: string[]) =>
    groupByLetter(
      words.map((word) => entry({ word })),
      "ashaninka",
    ).map((group) => group.letter);

  it("gives each digraph its own section", () => {
    expect(letters(["chakopi", "sheri", "tsaparipaye", "tyapa"])).toEqual([
      "Ch",
      "Sh",
      "Ts",
      "Ty",
    ]);
  });

  it("keeps a digraph section apart from its initial letter", () => {
    expect(letters(["seri", "sheri", "tapa", "tsapa", "tyapa"])).toEqual([
      "S",
      "Sh",
      "T",
      "Ts",
      "Ty",
    ]);
  });

  it("orders sections by the official alphabet", () => {
    expect(letters(["ya", "chakopi", "aa", "ñaa", "noa"])).toEqual([
      "A",
      "Ch",
      "N",
      "Ñ",
      "Y",
    ]);
  });

  it("puts a plain s word in S and an sh word in Sh", () => {
    const groups = groupByLetter(
      [entry({ word: "seri" }), entry({ word: "sheri" })],
      "ashaninka",
    );

    expect(groups[0].entries.map((item) => item.word)).toEqual(["seri"]);
    expect(groups[1].entries.map((item) => item.word)).toEqual(["sheri"]);
  });
});
