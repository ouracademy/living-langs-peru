import { describe, expect, it } from "vitest";

import { parsePack } from "@/lib/language-packs/schema";

import { testPack } from "./fixtures";

describe("parsePack: the voice block (AC-SP4c-8)", () => {
  it("keeps a voice block and rejects an unknown quality", () => {
    const base = testPack();
    const tts = { lang: "es-PE", quality: "off" as const };
    const kept = parsePack({ ...base, language: { ...base.language, tts } });
    expect(kept.ok && kept.pack.language.tts).toEqual(tts);

    const unknown = parsePack({
      ...base,
      language: { ...base.language, tts: { lang: "es-PE", quality: "native" } },
    });
    expect(unknown.ok).toBe(false);
  });
});

describe("parsePack", () => {
  // AC-SP1-1
  it("accepts a valid pack", () => {
    const result = parsePack(testPack());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.themes[0].items).toHaveLength(4);
    }
  });

  // AC-SP1-1
  it("rejects a different schema", () => {
    expect(parsePack({ ...testPack(), schema: "language-pack/2" }).ok).toBe(
      false,
    );
  });

  // AC-SP1-1
  it("rejects a pack without themes", () => {
    const withoutThemes: Record<string, unknown> = { ...testPack() };
    delete withoutThemes.themes;

    expect(parsePack(withoutThemes).ok).toBe(false);
  });

  // AC-SP1-1
  it("rejects an unknown mode", () => {
    const pack = testPack();
    const broken = {
      ...pack,
      themes: [{ ...pack.themes[0], mode: "dance" }],
    };

    expect(parsePack(broken).ok).toBe(false);
  });

  it("rejects what is not an object", () => {
    expect(parsePack(null).ok).toBe(false);
    expect(parsePack("pack").ok).toBe(false);
  });

  it("reports where it failed, without repairing anything", () => {
    const pack = testPack();
    const result = parsePack({
      ...pack,
      sources: [{ id: "x", kind: "rumour", title: "y" }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(" ")).toContain("sources");
    }
  });

  it("defaults a missing item id to empty and a missing verified to false", () => {
    const pack = testPack();
    const bare: Record<string, unknown> = { ...pack.themes[0].items[0] };
    delete bare.id;
    delete bare.verified;
    const result = parsePack({
      ...pack,
      themes: [{ ...pack.themes[0], items: [bare] }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.themes[0].items[0].id).toBe("");
      expect(result.pack.themes[0].items[0].verified).toBe(false);
    }
  });
});
