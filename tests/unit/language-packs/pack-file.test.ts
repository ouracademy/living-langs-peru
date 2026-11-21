import { describe, expect, it } from "vitest";

import {
  exportPackText,
  importPackText,
  itemAnchor,
  packFileName,
  summarizePack,
} from "@/lib/language-packs/pack-file";

import { testItem, testPack, testTheme } from "./fixtures";

describe("importPackText", () => {
  it("refuses text that is not JSON, without a pack", () => {
    const result = importPackText("{ esto no es json");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]).toMatch(/no es un JSON válido/);
  });

  // AC-SP6-4
  it("refuses a JSON that is not a pack, saying where", () => {
    const result = importPackText(JSON.stringify({ schema: "otra-cosa" }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.length).toBeGreaterThan(0);
  });

  it("cleans what it imports: an item without id gets one", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: [testItem({ id: "" }), ...testTheme().items.slice(1)],
        }),
      ],
    });

    const result = importPackText(JSON.stringify(pack));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pack.themes[0].items[0].id).not.toBe("");
  });
});

describe("exportPackText", () => {
  // AC-SP6-3
  it("exports a pack that imports back to the same pack", () => {
    const imported = importPackText(JSON.stringify(testPack()));
    if (!imported.ok) throw new Error("fixture should import");

    const again = importPackText(exportPackText(imported.pack));

    expect(again).toEqual({ ok: true, pack: imported.pack });
  });
});

describe("summarizePack", () => {
  it("counts items, unverified and without audio", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            testItem({ verified: false }),
            testItem({ id: "b", audio: "https://x/audio/b.mp3" }),
          ],
        }),
      ],
    });

    expect(summarizePack(pack)).toEqual({
      themes: 1,
      items: 2,
      unverified: 1,
      withoutAudio: 1,
    });
  });
});

describe("itemAnchor and packFileName", () => {
  it("builds safe anchors for a theme and for an item", () => {
    expect(itemAnchor("tema 1")).toBe("tema-tema_1");
    expect(itemAnchor("tema", "ítem/2")).toBe("item-tema-_tem_2");
  });

  it("names a draft and a version", () => {
    expect(packFileName("ashaninka")).toBe("ashaninka-borrador.json");
    expect(packFileName("ashaninka", 3)).toBe("ashaninka-v3.json");
  });
});
