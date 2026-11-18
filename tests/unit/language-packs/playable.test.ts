import { describe, expect, it } from "vitest";

import { playableThemes } from "@/lib/language-packs/playable";

import { testItem, testPack, testTheme } from "./fixtures";

function itemIds(pack: ReturnType<typeof testPack>) {
  return playableThemes(pack).flatMap((theme) =>
    theme.items.map((item) => item.id),
  );
}

describe("playableThemes", () => {
  it("keeps a pic2word theme with enough verified, sourced items", () => {
    const themes = playableThemes(testPack());

    expect(themes).toHaveLength(1);
    expect(themes[0].items).toHaveLength(4);
  });

  // AC-SP1-4
  it("drops every unverified item", () => {
    const base = testTheme();
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            ...base.items,
            testItem({ id: "oculto", word: "PRUEBA oculta", verified: false }),
          ],
        }),
      ],
    });

    expect(itemIds(pack)).not.toContain("oculto");
  });

  // AC-SP1-4
  it("drops the theme when only unverified items would be left", () => {
    const pack = testPack({
      themes: [
        testTheme({
          items: testTheme().items.map((item) => ({
            ...item,
            verified: false,
          })),
        }),
      ],
    });

    expect(playableThemes(pack)).toEqual([]);
  });

  // AC-SP1-5
  it("drops items whose source does not resolve", () => {
    const base = testTheme();
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            ...base.items,
            testItem({ id: "sin-fuente", word: "PRUEBA cinco", sourceId: "x" }),
            testItem({
              id: "fuente-vacia",
              word: "PRUEBA seis",
              sourceId: undefined,
            }),
          ],
        }),
      ],
    });

    expect(itemIds(pack)).not.toContain("sin-fuente");
    expect(itemIds(pack)).not.toContain("fuente-vacia");
  });

  it("needs three items with an emoji and different words for pic2word", () => {
    const [one, two, three] = testTheme().items;
    const noEmoji = testPack({
      themes: [testTheme({ items: [one, two, { ...three, emoji: "" }] })],
    });
    const sameWord = testPack({
      themes: [
        testTheme({ items: [one, two, { ...three, word: "prueba UNO" }] }),
      ],
    });

    expect(playableThemes(noEmoji)).toEqual([]);
    expect(playableThemes(sameWord)).toEqual([]);
  });

  it("drops items without a word or a translation", () => {
    const base = testTheme();
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            ...base.items,
            testItem({
              id: "sin-traduccion",
              word: "PRUEBA siete",
              translation: "",
            }),
          ],
        }),
      ],
    });

    expect(itemIds(pack)).not.toContain("sin-traduccion");
  });

  it("does not play the other modes yet (F1b)", () => {
    const pack = testPack({
      themes: [testTheme({ id: "otro", mode: "word2pic" })],
    });

    expect(playableThemes(pack)).toEqual([]);
  });

  it("does not change the pack", () => {
    const pack = testPack();
    const copy = structuredClone(pack);

    playableThemes(pack);

    expect(pack).toEqual(copy);
  });
});
