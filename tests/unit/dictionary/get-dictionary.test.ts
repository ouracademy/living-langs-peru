import { describe, expect, it } from "vitest";

import { getDictionary, isProvisional } from "@/lib/dictionary";

describe("getDictionary", () => {
  it("returns the Asháninka dictionary", () => {
    const dictionary = getDictionary("ashaninka");

    expect(dictionary).not.toBeNull();
    expect(dictionary?.language).toBe("ashaninka");
    expect(dictionary?.entries.length).toBeGreaterThanOrEqual(3);
  });

  // A language may exist in languages.ts without having a dictionary yet.
  it("returns null for a language that has no dictionary file", () => {
    expect(getDictionary("uro")).toBeNull();
  });

  it("returns null for an unknown language", () => {
    expect(getDictionary("klingon")).toBeNull();
  });

  it("gives every entry an id, a word and at least one translation", () => {
    const entries = getDictionary("ashaninka")?.entries ?? [];

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.id).toBeTruthy();
      expect(entry.word).toBeTruthy();
      expect(entry.translations.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.examples)).toBe(true);
    }
  });

  it("has at least one entry carrying a usage example", () => {
    const entries = getDictionary("ashaninka")?.entries ?? [];
    const withExamples = entries.filter((entry) => entry.examples.length > 0);

    expect(withExamples.length).toBeGreaterThanOrEqual(1);
    for (const entry of withExamples) {
      for (const example of entry.examples) {
        expect(example.sentence).toBeTruthy();
        expect(example.translation).toBeTruthy();
      }
    }
  });

  it("does not reuse an id within a language", () => {
    const entries = getDictionary("ashaninka")?.entries ?? [];
    const ids = entries.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("isProvisional", () => {
  it("flags the seed dictionary while it still carries placeholder content", () => {
    const dictionary = getDictionary("ashaninka");

    expect(dictionary).not.toBeNull();
    expect(isProvisional(dictionary!)).toBe(true);
  });

  it("clears once every entry cites a real source", () => {
    const dictionary = {
      language: "ashaninka",
      entries: [
        {
          id: "w",
          word: "w",
          translations: ["x"],
          examples: [],
          sourceId: "some-real-source",
        },
      ],
    } as const;

    expect(isProvisional(dictionary)).toBe(false);
  });
});
