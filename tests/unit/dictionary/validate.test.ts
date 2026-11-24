import { describe, expect, it } from "vitest";

import { parseBundle } from "@/lib/language-bundles/schema";
import { validateBundle } from "@/lib/language-bundles/validate";

import { testBundle, testEntry } from "../language-bundles/fixtures";

// gestor-lenguas F4: the dictionary's data is checked as part of its language
// bundle, by the same two steps as `pnpm bundles:check` and /admin/lenguas —
// parseBundle for the shape, validateBundle for the rules. These are the
// cases validateDictionary used to cover, against their new home.
function problems(raw: unknown, language = "uro"): string[] {
  const parsed = parseBundle(raw);
  if (!parsed.ok) return parsed.issues;
  return validateBundle(parsed.bundle, { language }).errors.map(
    (issue) => issue.message,
  );
}

const valid = testBundle();
const [first] = valid.entries;

describe("the dictionary's data, checked as a bundle", () => {
  it("accepts a well-formed dictionary", () => {
    expect(problems(valid)).toEqual([]);
  });

  // AC-M1-10
  it("rejects a duplicated id", () => {
    const found = problems({
      ...valid,
      entries: [...valid.entries, { ...first, word: "otra" }],
    });

    expect(found.join(" ")).toMatch(
      /más de una palabra con el id «prueba-uno»/i,
    );
  });

  // Spec gestor-lenguas #3: a bundle's ids are stable, so they no longer have
  // to be the slug of the word (the old slugify rule).
  it("accepts an id that is not the slug of its word", () => {
    const found = problems({
      ...valid,
      entries: [{ ...first, id: "no-coincide" }, ...valid.entries.slice(1)],
      themes: [],
    });

    expect(found).toEqual([]);
  });

  it("rejects an entry with no translations", () => {
    const found = problems({
      ...valid,
      entries: [{ ...first, translations: [] }],
    });

    expect(found.join(" ")).toMatch(/entries\.0\.translations/);
  });

  it("rejects an example missing its sentence or translation", () => {
    const found = problems({
      ...valid,
      entries: [{ ...first, examples: [{ sentence: "", translation: "t" }] }],
    });

    expect(found.join(" ")).toMatch(/entries\.0\.examples\.0\.sentence/);
  });

  it("rejects a missing or unknown language", () => {
    expect(problems({ ...valid, language: "klingon" }).join(" ")).toMatch(
      /language/,
    );
  });

  // The guard that keeps scaffolding out of production: every entry cites a
  // source the bundle carries, so a placeholder one cannot get through.
  it("rejects a source the bundle does not carry", () => {
    const found = problems({
      ...valid,
      entries: [testEntry({ sourceId: "placeholder" })],
    });

    expect(found.join(" ")).toMatch(/placeholder/i);
  });

  it("rejects a shape that is not a dictionary at all", () => {
    expect(problems(null).length).toBeGreaterThan(0);
    expect(problems({ entries: "nope" }).length).toBeGreaterThan(0);
  });

  it("names the offending entry so the message is actionable", () => {
    const found = problems({
      ...valid,
      entries: [testEntry({ sourceId: "placeholder" })],
    });

    expect(found[0]).toContain("pato");
  });
});
