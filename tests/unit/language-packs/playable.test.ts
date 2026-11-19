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

  // AC-SP1-6: listen needs three items with audio, and is built in F3.
  it("does not play a listen theme with only two items with audio", () => {
    const base = testTheme();
    const pack = testPack({
      themes: [
        testTheme({
          id: "escuchar",
          mode: "listen",
          items: [
            ...base.items,
            testItem({ id: "item-cinco", word: "PRUEBA cinco" }),
          ].map((item, index) =>
            index < 2
              ? { ...item, audio: `https://audio.prueba/${item.id}.webm` }
              : item,
          ),
        }),
      ],
    });

    expect(playableThemes(pack)).toEqual([]);
  });

  it("plays word2pic with three different emojis, not with two", () => {
    const base = testTheme();
    const three = testPack({
      themes: [testTheme({ mode: "word2pic", items: base.items.slice(0, 3) })],
    });
    const two = testPack({
      themes: [
        testTheme({
          mode: "word2pic",
          items: base.items
            .slice(0, 3)
            .map((item, index) =>
              index === 2 ? { ...item, emoji: "🍎" } : item,
            ),
        }),
      ],
    });

    expect(playableThemes(three).map((theme) => theme.id)).toEqual([
      "tema-prueba",
    ]);
    expect(playableThemes(two)).toEqual([]);
  });

  it("plays first with one item whose initial is a grapheme of the language", () => {
    const pack = testPack({
      themes: [testTheme({ mode: "first", items: [testItem()] })],
    });

    expect(itemIds(pack)).toEqual(["item-uno"]);
  });

  it("drops first items whose initial the language does not list", () => {
    const pack = testPack({
      themes: [
        testTheme({
          mode: "first",
          items: [testItem(), testItem({ id: "item-zeta", word: "zPRUEBA" })],
        }),
      ],
    });

    expect(itemIds(pack)).toEqual(["item-uno"]);
  });

  it("does not play first when the language has fewer than three graphemes", () => {
    const base = testPack();
    const pack = testPack({
      language: { ...base.language, graphemes: ["p", "r"] },
      themes: [testTheme({ mode: "first", items: [testItem()] })],
    });

    expect(playableThemes(pack)).toEqual([]);
  });

  it("plays vowel with one item that has a vowel of the language", () => {
    const pack = testPack({
      themes: [
        testTheme({
          mode: "vowel",
          items: [testItem(), testItem({ id: "item-prb", word: "prb" })],
        }),
      ],
    });

    expect(itemIds(pack)).toEqual(["item-uno"]);
  });

  it("does not change the pack", () => {
    const pack = testPack();
    const copy = structuredClone(pack);

    playableThemes(pack);

    expect(pack).toEqual(copy);
  });
});
