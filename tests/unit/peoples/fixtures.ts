import type { People, Source } from "@/lib/peoples/types";

function source(id: string): Source {
  return {
    id,
    title: `Obra ${id}`,
    publisher: `Editorial ${id}`,
    url: `https://example.org/${id}`,
    retrievedAt: "2026-09-16",
  };
}

/**
 * Built for the hard cases of footnote numbering, not for realism:
 *
 * - `b` is cited first (in the summary) but declared second, so numbering
 *   cannot come from the order of `sources`.
 * - `a` and `b` are each cited three times and must collapse to one number.
 * - `a` and `c` appear together in one paragraph.
 * - `orphan` is declared and never cited.
 */
export function peopleFixture(): People {
  return {
    slug: "ashaninka",
    name: "Pueblo de prueba",
    summary: { text: "Resumen", sourceIds: ["b"] },
    language: {
      family: "Arawak",
      isoCodes: ["cni"],
      letters: 19,
      sourceIds: ["b"],
    },
    figures: [
      {
        id: "first",
        label: "Primera",
        value: 10,
        unit: "people",
        sourceId: "a",
      },
      {
        id: "second",
        label: "Segunda",
        value: 20,
        unit: "people",
        sourceId: "b",
      },
    ],
    sections: [
      {
        id: "historia",
        title: "Historia",
        paragraphs: [{ text: "Párrafo", sourceIds: ["c", "a"] }],
      },
    ],
    timeline: [
      {
        id: "event",
        period: "1742",
        title: "Suceso",
        text: "Texto",
        sourceIds: ["d"],
      },
    ],
    territory: { regions: [], rivers: [], basins: [], sourceIds: ["a"] },
    photos: [],
    sources: [
      source("a"),
      source("b"),
      source("c"),
      source("d"),
      source("orphan"),
    ],
    updatedAt: "2026-09-16",
  };
}
