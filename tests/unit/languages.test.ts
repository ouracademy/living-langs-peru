import { describe, expect, it } from "vitest";

import { getLanguage, languages } from "@/lib/languages";

describe("languages", () => {
  it("resolves a known language by slug", () => {
    expect(getLanguage("ashaninka")?.name).toBe("Asháninka");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getLanguage("klingon")).toBeUndefined();
  });

  it("exposes every language with a slug and a name", () => {
    expect(languages.length).toBeGreaterThan(0);
    for (const language of languages) {
      expect(language.slug).toBeTruthy();
      expect(language.name).toBeTruthy();
    }
  });
});
