import { describe, expect, it, vi } from "vitest";

import { audioBaseUrlFrom } from "@/lib/language-bundles/audio";

vi.mock("server-only", () => ({}));

const { publishErrorFor } = await import("@/lib/language-bundles/publishing");

// Moved from the retired /admin/juego (gestor-lenguas F4): the bundle admin
// uses the same Postgres codes and the same audio bucket.
describe("publishErrorFor", () => {
  it("translates the codes of publish_language_bundle", () => {
    expect(publishErrorFor("40001")).toBe("version_conflict");
    expect(publishErrorFor("22023")).toBe("language_mismatch");
    expect(publishErrorFor("42501")).toBe("unavailable");
    expect(publishErrorFor(undefined)).toBe("unavailable");
  });
});

describe("audioBaseUrlFrom", () => {
  it("builds the public audio bucket URL from SUPABASE_URL", () => {
    expect(audioBaseUrlFrom({ SUPABASE_URL: "https://p.supabase.co/" })).toBe(
      "https://p.supabase.co/storage/v1/object/public/audio/",
    );
    expect(audioBaseUrlFrom({})).toBeNull();
    expect(audioBaseUrlFrom({ SUPABASE_URL: "  " })).toBeNull();
  });
});
