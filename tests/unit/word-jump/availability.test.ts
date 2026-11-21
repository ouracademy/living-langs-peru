import { describe, expect, it } from "vitest";

import { languages } from "@/lib/languages";
import {
  LANGUAGES_WITHOUT_PACK,
  hasNoPack,
} from "@/lib/word-jump/availability";

describe("hasNoPack", () => {
  // AC-SP4-9: uro is answered from code, never from the database.
  it("knows uro has no pack, with a reason", () => {
    expect(hasNoPack("uro")).toBe(true);
    expect(LANGUAGES_WITHOUT_PACK.uro).toContain("no tiene hablantes");
  });

  it("does not rule out a language that may get one", () => {
    expect(hasNoPack("ashaninka")).toBe(false);
  });

  it("does not trip on inherited keys", () => {
    expect(hasNoPack("toString")).toBe(false);
  });

  it("only lists languages the site knows", () => {
    const known = new Set<string>(languages.map((language) => language.slug));

    for (const slug of Object.keys(LANGUAGES_WITHOUT_PACK)) {
      expect(known.has(slug)).toBe(true);
    }
  });
});
