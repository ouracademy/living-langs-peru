import { describe, expect, it } from "vitest";

import {
  buildFootnotes,
  citationId,
  citationsFor,
} from "@/lib/peoples/footnotes";

import type { People, Source } from "@/lib/peoples/types";

import { peopleFixture } from "./fixtures";

function extraSource(id: string): Source {
  return {
    id,
    title: `Obra ${id}`,
    publisher: `Editorial ${id}`,
    url: `https://example.org/${id}`,
    retrievedAt: "2026-09-16",
  };
}

/**
 * The map is drawn inside the territory section, so its attribution sits in
 * the middle of the page: after the history and territory prose, before the
 * life section that follows.
 */
function withMapBetweenSections(): People {
  const people = peopleFixture();

  people.sources.push(extraSource("map"), extraSource("life"));
  people.sections = [
    {
      id: "historia",
      title: "Historia",
      paragraphs: [{ text: "h", sourceIds: ["c"] }],
    },
    {
      id: "territorio",
      title: "Territorio",
      paragraphs: [{ text: "t", sourceIds: ["a"] }],
    },
    {
      id: "vida",
      title: "Vida",
      paragraphs: [{ text: "v", sourceIds: ["life"] }],
    },
  ];
  people.territory.sourceIds = ["map"];

  return people;
}

describe("buildFootnotes", () => {
  it("numbers sources in the order they are rendered, not declared", () => {
    // `b` is declared second but cited first, in the summary.
    const footnotes = buildFootnotes(peopleFixture());

    expect(footnotes.map((footnote) => footnote.source.id)).toEqual([
      "b",
      "a",
      "c",
      "d",
    ]);
    expect(footnotes.map((footnote) => footnote.number)).toEqual([1, 2, 3, 4]);
  });

  // The number a reader meets first on the page must be the smallest. The map
  // renders inside the territory section, so its source comes before the
  // sections that follow that one — not after all of them.
  it("numbers the map's source where the map renders", () => {
    const ids = buildFootnotes(withMapBetweenSections()).map(
      (footnote) => footnote.source.id,
    );

    expect(ids).toEqual(["b", "a", "c", "map", "life", "d"]);
  });

  // With no territory section nothing draws the map, but its source must still
  // be walked: `peoples:check` validates citations through the same list.
  it("still walks the map's source when there is no territory section", () => {
    const people = peopleFixture();

    people.sources.push(extraSource("map"));
    people.territory.sourceIds = ["map"];

    const ids = buildFootnotes(people).map((footnote) => footnote.source.id);

    expect(ids).toEqual(["b", "a", "c", "map", "d"]);
  });

  it("gives a source cited many times a single number", () => {
    const footnotes = buildFootnotes(peopleFixture());
    const forA = footnotes.filter((footnote) => footnote.source.id === "a");

    expect(forA).toHaveLength(1);
  });

  it("leaves out a source that is declared but never cited", () => {
    const footnotes = buildFootnotes(peopleFixture());

    expect(footnotes.some((footnote) => footnote.source.id === "orphan")).toBe(
      false,
    );
  });

  it("points back at the first place that cites it, not the last", () => {
    const footnotes = buildFootnotes(peopleFixture());
    const anchorOf = (id: string) =>
      footnotes.find((footnote) => footnote.source.id === id)?.backTo;

    // `b` is first cited in the summary, `a` in the first figure, `c` in the
    // first paragraph of «historia», `d` in the timeline.
    expect(anchorOf("b")).toBe(citationId("resumen"));
    expect(anchorOf("a")).toBe(citationId("cifra", "first"));
    expect(anchorOf("c")).toBe(citationId("parrafo", "historia", 0));
    expect(anchorOf("d")).toBe(citationId("suceso", "event"));
  });

  it("carries the whole source, so the note can render its link and date", () => {
    const [first] = buildFootnotes(peopleFixture());

    expect(first.source.url).toBe("https://example.org/b");
    expect(first.source.retrievedAt).toBe("2026-09-16");
  });
});

describe("citationsFor", () => {
  it("returns the numbers ascending, whatever order the ids come in", () => {
    const footnotes = buildFootnotes(peopleFixture());

    expect(citationsFor(footnotes, ["c", "a"])).toEqual([2, 3]);
  });

  it("does not repeat a number when an id appears twice", () => {
    const footnotes = buildFootnotes(peopleFixture());

    expect(citationsFor(footnotes, ["a", "a", "c"])).toEqual([2, 3]);
  });

  it("skips an id that has no footnote", () => {
    const footnotes = buildFootnotes(peopleFixture());

    expect(citationsFor(footnotes, ["orphan", "a"])).toEqual([2]);
    expect(citationsFor(footnotes, [])).toEqual([]);
  });
});
