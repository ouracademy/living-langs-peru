import { describe, expect, it } from "vitest";

import { containsTerm, splitTerms } from "@/lib/peoples/terms";

describe("splitTerms", () => {
  it("returns the whole text as one plain segment when there are no terms", () => {
    expect(splitTerms("Una casa grande.")).toEqual([
      { text: "Una casa grande.", term: false },
    ]);
    expect(splitTerms("Una casa grande.", [])).toEqual([
      { text: "Una casa grande.", term: false },
    ]);
  });

  it("returns nothing for an empty text", () => {
    expect(splitTerms("", ["káapa"])).toEqual([]);
  });

  it("wraps each term and keeps the text around it", () => {
    expect(splitTerms("La káapa y la intómoe.", ["káapa", "intómoe"])).toEqual([
      { text: "La ", term: false },
      { text: "káapa", term: true },
      { text: " y la ", term: false },
      { text: "intómoe", term: true },
      { text: ".", term: false },
    ]);
  });

  it("marks every occurrence, not just the first", () => {
    const marked = splitTerms("Un sheripiari cura; otro sheripiari canta.", [
      "sheripiari",
    ]).filter((segment) => segment.term);

    expect(marked).toHaveLength(2);
  });

  // «ene» is a river; it must not light up inside «tenemos» or «Tenerife».
  it("matches whole words only", () => {
    expect(splitTerms("Tenemos el río Ene.", ["ene"])).toEqual([
      { text: "Tenemos el río ", term: false },
      { text: "Ene", term: true },
      { text: ".", term: false },
    ]);
  });

  it("ignores case but keeps the casing of the text", () => {
    expect(splitTerms("Káapa es la casa.", ["káapa"])).toEqual([
      { text: "Káapa", term: true },
      { text: " es la casa.", term: false },
    ]);
  });

  it("matches through unicode normalisation", () => {
    const decomposed = "káapa"; // «káapa» typed as k + a + combining acute

    expect(containsTerm(`La ${decomposed} vieja`, "káapa")).toBe(true);
  });

  it("prefers the longest term where two overlap", () => {
    expect(splitTerms("El pinkathari habló.", ["pinka", "pinkathari"])).toEqual(
      [
        { text: "El ", term: false },
        { text: "pinkathari", term: true },
        { text: " habló.", term: false },
      ],
    );
  });

  it("treats characters that mean something in a pattern literally", () => {
    const marked = splitTerms("axb y a.b", ["a.b"]).filter(
      (segment) => segment.term,
    );

    expect(marked).toEqual([{ text: "a.b", term: true }]);
  });

  it("ignores blank terms instead of matching everywhere", () => {
    expect(splitTerms("Una casa.", ["", "  "])).toEqual([
      { text: "Una casa.", term: false },
    ]);
  });
});

describe("containsTerm", () => {
  it("is true only for a whole word", () => {
    expect(containsTerm("La intómoe era femenina.", "intómoe")).toBe(true);
    expect(containsTerm("Las intómoes eran varias.", "intómoe")).toBe(false);
    expect(containsTerm("Nada que ver.", "intómoe")).toBe(false);
  });
});
