import { describe, expect, it } from "vitest";

import { getLanguagesWithDictionary } from "@/lib/dictionary";
import { languages } from "@/lib/languages";

describe("getLanguagesWithDictionary", () => {
  // AC-M1-9
  it("includes Asháninka with its entry count", () => {
    const ashaninka = getLanguagesWithDictionary().find(
      (language) => language.slug === "ashaninka",
    );

    expect(ashaninka?.name).toBe("Asháninka");
    expect(ashaninka?.total).toBeGreaterThan(0);
  });

  it("leaves out a language that has no dictionary file", () => {
    const slugs = getLanguagesWithDictionary().map((language) => language.slug);

    expect(slugs).not.toContain("uro");
  });

  it("never reports more languages than exist", () => {
    expect(getLanguagesWithDictionary().length).toBeLessThanOrEqual(
      languages.length,
    );
  });
});
