import { describe, expect, it } from "vitest";

import {
  buildFootnotes,
  citationId,
  citationsFor,
} from "@/lib/peoples/footnotes";

import { peopleFixture } from "./fixtures";

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
