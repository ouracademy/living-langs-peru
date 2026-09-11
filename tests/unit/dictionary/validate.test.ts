import { describe, expect, it } from "vitest";

import { validateDictionary } from "@/lib/dictionary/validate";

const valid = {
  language: "ashaninka",
  entries: [
    {
      id: "casa",
      word: "casa",
      translations: ["house"],
      examples: [{ sentence: "s", translation: "t" }],
      sourceId: "real-source",
    },
  ],
};

describe("validateDictionary", () => {
  it("accepts a well-formed dictionary", () => {
    expect(validateDictionary(valid)).toEqual([]);
  });

  // AC-M1-10
  it("rejects a duplicated id", () => {
    const problems = validateDictionary({
      ...valid,
      entries: [...valid.entries, { ...valid.entries[0], word: "otra" }],
    });

    expect(problems.join(" ")).toMatch(/id duplicado/i);
  });

  it("rejects an id that is not the slug of its word", () => {
    const problems = validateDictionary({
      ...valid,
      entries: [{ ...valid.entries[0], id: "no-coincide" }],
    });

    expect(problems.join(" ")).toMatch(/slugify/i);
  });

  it("rejects an entry with no translations", () => {
    const problems = validateDictionary({
      ...valid,
      entries: [{ ...valid.entries[0], translations: [] }],
    });

    expect(problems.join(" ")).toMatch(/traducción/i);
  });

  it("rejects an example missing its sentence or translation", () => {
    const problems = validateDictionary({
      ...valid,
      entries: [
        {
          ...valid.entries[0],
          examples: [{ sentence: "", translation: "t" }],
        },
      ],
    });

    expect(problems.join(" ")).toMatch(/ejemplo/i);
  });

  it("rejects a missing or unknown language", () => {
    expect(
      validateDictionary({ ...valid, language: "klingon" }).join(" "),
    ).toMatch(/lengua/i);
  });

  // The guard that keeps scaffolding out of production.
  it("rejects placeholder content", () => {
    const problems = validateDictionary({
      ...valid,
      entries: [{ ...valid.entries[0], sourceId: "placeholder" }],
    });

    expect(problems.join(" ")).toMatch(/placeholder/i);
  });

  it("rejects a shape that is not a dictionary at all", () => {
    expect(validateDictionary(null).length).toBeGreaterThan(0);
    expect(validateDictionary({ entries: "nope" }).length).toBeGreaterThan(0);
  });

  it("names the offending entry so the message is actionable", () => {
    const problems = validateDictionary({
      ...valid,
      entries: [{ ...valid.entries[0], translations: [] }],
    });

    expect(problems[0]).toContain("casa");
  });
});
