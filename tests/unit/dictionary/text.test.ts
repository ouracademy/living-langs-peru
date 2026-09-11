import { describe, expect, it } from "vitest";

import { compareWords, normalize, slugify } from "@/lib/dictionary/text";

describe("normalize", () => {
  // AC-M1-1
  it("lowercases and preserves ñ as its own letter", () => {
    expect(normalize("Ñaaka")).toBe("ñaaka");
    expect(normalize("ÑAAKA")).toBe("ñaaka");
  });

  it("strips diacritics", () => {
    expect(normalize("Perú")).toBe("peru");
    expect(normalize("Ámbito")).toBe("ambito");
    expect(normalize("coöperación")).toBe("cooperacion");
  });

  it("keeps ñ distinct from n after normalizing", () => {
    expect(normalize("ñ")).not.toBe(normalize("n"));
  });

  it("trims surrounding whitespace", () => {
    expect(normalize("  casa  ")).toBe("casa");
  });

  it("handles the empty string", () => {
    expect(normalize("")).toBe("");
  });
});

describe("slugify", () => {
  it("produces a lowercase hyphenated ascii slug", () => {
    expect(slugify("Placeholder A")).toBe("placeholder-a");
    expect(slugify("Perú")).toBe("peru");
  });

  // The generated link is ascii; resolveWord still accepts the raw word.
  it("folds ñ to n so the slug stays ascii", () => {
    expect(slugify("ñaaka")).toBe("naaka");
  });

  it("collapses runs of separators and trims them", () => {
    expect(slugify("  dos   palabras  ")).toBe("dos-palabras");
    expect(slugify("con'apóstrofo")).toBe("con-apostrofo");
    expect(slugify("--guiones--")).toBe("guiones");
  });

  it("is stable when applied twice", () => {
    const once = slugify("Ñaaka Perú");

    expect(slugify(once)).toBe(once);
  });
});

describe("compareWords", () => {
  // AC-M1-2
  it("orders ñ after n and before o", () => {
    expect(compareWords("na", "ña")).toBeLessThan(0);
    expect(compareWords("ña", "oa")).toBeLessThan(0);
  });

  it("does not separate á from a", () => {
    expect(compareWords("arbol", "árbol")).toBe(0);
  });

  it("sorts a list into Spanish alphabetical order", () => {
    const sorted = ["ñuu", "oro", "napa", "arbol", "árbol2"].sort(compareWords);

    expect(sorted).toEqual(["arbol", "árbol2", "napa", "ñuu", "oro"]);
  });

  it("ignores case", () => {
    expect(compareWords("Casa", "casa")).toBe(0);
  });
});
