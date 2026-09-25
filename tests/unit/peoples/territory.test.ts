import { describe, expect, it } from "vitest";

import { ashaninka } from "@/lib/peoples";
import { PERU_DEPARTMENTS } from "@/lib/peoples/peru-departments";
import { highlightedRegionIds, unknownRegions } from "@/lib/peoples/territory";
import type { Territory } from "@/lib/peoples/types";

function territoryOf(regions: string[]): Territory {
  return { regions, rivers: [], basins: [], sourceIds: ["bdpi-ashaninka"] };
}

describe("highlightedRegionIds", () => {
  it("resolves the six Asháninka regions from the real data", () => {
    expect(highlightedRegionIds(ashaninka.territory)).toEqual([
      "ayacucho",
      "cusco",
      "huanuco",
      "junin",
      "pasco",
      "ucayali",
    ]);
  });

  // AC-M1-11: the JSON spells regions the way a reader does.
  it("matches through diacritics and casing", () => {
    expect(highlightedRegionIds(territoryOf(["Junín"]))).toEqual(["junin"]);
    expect(highlightedRegionIds(territoryOf(["HUÁNUCO"]))).toEqual(["huanuco"]);
    expect(highlightedRegionIds(territoryOf(["  ucayali  "]))).toEqual([
      "ucayali",
    ]);
  });

  it("drops a region the map does not have, rather than inventing an id", () => {
    expect(highlightedRegionIds(territoryOf(["Junín", "Atlántida"]))).toEqual([
      "junin",
    ]);
  });

  it("returns each id once and in a stable order", () => {
    expect(
      highlightedRegionIds(territoryOf(["Ucayali", "Junín", "Ucayali"])),
    ).toEqual(["junin", "ucayali"]);
  });

  it("returns nothing for an empty territory", () => {
    expect(highlightedRegionIds(territoryOf([]))).toEqual([]);
  });
});

describe("unknownRegions", () => {
  // AC-M1-12: a name the SVG cannot draw is a data error, never a silent skip.
  it("names the regions the map cannot draw", () => {
    expect(unknownRegions(territoryOf(["Junín", "Atlántida"]))).toEqual([
      "Atlántida",
    ]);
  });

  it("is empty for the real data", () => {
    expect(unknownRegions(ashaninka.territory)).toEqual([]);
  });
});

describe("the map data itself", () => {
  it("covers the whole country with unique ids", () => {
    const ids = PERU_DEPARTMENTS.map((department) => department.id);

    expect(ids.length).toBe(26);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every department a name and a drawable path", () => {
    for (const department of PERU_DEPARTMENTS) {
      expect(department.name.trim()).not.toBe("");
      // One `M…Z` per ring, several of them for a department with islands.
      expect(department.d).toMatch(/^M[\d.\-\sLMZ]+Z$/);
    }
  });
});
