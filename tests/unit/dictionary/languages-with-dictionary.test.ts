import { describe, expect, it, vi } from "vitest";

import { languages } from "@/lib/languages";

// gestor-lenguas F4: the languages listed are those with a bundle to show;
// with Supabase off, the repo's (src/data/bundles).
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-optional", () => ({ getOptionalSupabase: () => null }));

const { getLanguagesWithContent } = await import("@/lib/dictionary/content");

describe("getLanguagesWithContent", () => {
  // AC-M1-9
  it("includes Asháninka with its entry count", async () => {
    const ashaninka = (await getLanguagesWithContent()).find(
      (language) => language.slug === "ashaninka",
    );

    expect(ashaninka?.name).toBe("Asháninka");
    expect(ashaninka?.total).toBeGreaterThan(0);
  });

  it("leaves out a language that has no bundle", async () => {
    const slugs = (await getLanguagesWithContent()).map(
      (language) => language.slug,
    );

    expect(slugs).not.toContain("uro");
  });

  it("never reports more languages than exist", async () => {
    expect((await getLanguagesWithContent()).length).toBeLessThanOrEqual(
      languages.length,
    );
  });
});
