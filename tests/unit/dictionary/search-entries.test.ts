import { describe, expect, it } from "vitest";

import { searchEntries } from "@/lib/dictionary";

import { entry } from "./fixtures";

/**
 * Built so the query "cas" hits each ranking level exactly once, which is the
 * only way to tell the levels apart rather than just "it matched something".
 */
const ranked = [
  entry({ id: "l5", word: "zzz-nivel5", translations: ["pescas"] }),
  entry({ id: "l3", word: "mascas", translations: ["sin relación"] }),
  entry({ id: "l1", word: "cas", translations: ["sin relación"] }),
  entry({ id: "l4", word: "zzz-nivel4", translations: ["cascada"] }),
  entry({ id: "l2", word: "casa", translations: ["sin relación"] }),
  entry({ id: "no", word: "nada", translations: ["otra cosa"] }),
];

const ids = (query: string, entries = ranked) =>
  searchEntries(entries, query).map((item) => item.id);

describe("searchEntries", () => {
  // AC-M1-7
  it("ranks exact word, prefix, substring, then translation prefix and substring", () => {
    expect(ids("cas")).toEqual(["l1", "l2", "l3", "l4", "l5"]);
  });

  it("drops entries that match nothing", () => {
    expect(ids("cas")).not.toContain("no");
  });

  // AC-M1-4
  it("returns every entry, alphabetically, for an empty query", () => {
    const all = searchEntries(ranked, "").map((item) => item.word);

    expect(all).toEqual([
      "cas",
      "casa",
      "mascas",
      "nada",
      "zzz-nivel4",
      "zzz-nivel5",
    ]);
  });

  it("treats a whitespace-only query as empty", () => {
    expect(searchEntries(ranked, "   ")).toHaveLength(ranked.length);
  });

  // AC-M1-5
  it("matches across accents in both directions", () => {
    const entries = [entry({ id: "a", word: "ñaánka", translations: ["x"] })];

    expect(ids("ñaanka", entries)).toEqual(["a"]);
    expect(ids("ñaánka", entries)).toEqual(["a"]);
  });

  // Deliberate, per spec §4.4: ñ is a letter of its own in Asháninka, not an
  // accented n, so it is not folded away the way á is.
  it("keeps ñ distinct from n when searching", () => {
    const entries = [entry({ id: "a", word: "ñaanka", translations: ["x"] })];

    expect(ids("naanka", entries)).toEqual([]);
  });

  it("ignores case", () => {
    expect(ids("CASA")).toContain("l2");
  });

  // AC-M1-6 — searching in Spanish must find the indigenous word.
  it("finds an entry by its Spanish translation", () => {
    const entries = [
      entry({ id: "house", word: "pankotsi", translations: ["casa"] }),
    ];

    expect(ids("casa", entries)).toEqual(["house"]);
  });

  it("matches a variant spelling", () => {
    const entries = [
      entry({ id: "v", word: "kija", variants: ["kiya"], translations: ["x"] }),
    ];

    expect(ids("kiya", entries)).toEqual(["v"]);
  });

  it("ranks an exact variant match as highly as an exact word match", () => {
    const entries = [
      entry({ id: "prefix", word: "kiyana", translations: ["x"] }),
      entry({ id: "exact", word: "kija", variants: ["kiya"], translations: ["x"] }),
    ];

    expect(ids("kiya", entries)).toEqual(["exact", "prefix"]);
  });

  it("orders alphabetically within a ranking level", () => {
    const entries = [
      entry({ id: "b", word: "casb", translations: ["x"] }),
      entry({ id: "a", word: "casa", translations: ["x"] }),
    ];

    expect(ids("cas", entries)).toEqual(["a", "b"]);
  });

  it("returns nothing when no entry matches", () => {
    expect(ids("zzzznomatch")).toEqual([]);
  });
});
