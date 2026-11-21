import { describe, expect, it } from "vitest";

import { playableThemes, previewThemes } from "@/lib/language-packs/playable";
import { previewPack } from "@/lib/word-jump/game-state";

import { testItem, testPack, testTheme } from "./fixtures";

const unverifiedPack = () =>
  testPack({
    themes: [
      testTheme({
        items: testTheme().items.map((item) => ({ ...item, verified: false })),
      }),
    ],
  });

// AC-SP6-10
describe("previewThemes", () => {
  it("keeps the unverified items that playableThemes drops", () => {
    const pack = unverifiedPack();

    expect(playableThemes(pack)).toEqual([]);
    expect(previewThemes(pack)[0].items).toHaveLength(4);
  });

  it("still drops items without word or translation, and themes under the minimum", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            testItem({ verified: false }),
            testItem({
              id: "sin-traduccion",
              word: "PRUEBA x",
              translation: " ",
            }),
          ],
        }),
      ],
    });

    expect(previewThemes(pack)).toEqual([]);
  });
});

describe("previewPack", () => {
  it("plays the unverified items, marked by their own flag, as version 0", () => {
    const preview = previewPack(unverifiedPack());

    expect(preview?.version).toBe(0);
    expect(preview?.themes[0].items.every((item) => !item.verified)).toBe(true);
  });

  it("is null when no theme reaches its minimum", () => {
    expect(previewPack(testPack({ themes: [] }))).toBeNull();
  });
});
