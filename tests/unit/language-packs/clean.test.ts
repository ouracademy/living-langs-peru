import { describe, expect, it } from "vitest";

import { cleanPack, normalizeWord } from "@/lib/language-packs/clean";

import { testItem, testPack, testTheme } from "./fixtures";

function packWithItems(items: ReturnType<typeof testItem>[]) {
  return testPack({ themes: [testTheme({ items })] });
}

describe("cleanPack", () => {
  // AC-SP1-2
  it("gives an id to a new item", () => {
    const cleaned = cleanPack(
      packWithItems([testItem({ id: "", word: "PRUEBA nueva" })]),
    );

    expect(cleaned.themes[0].items[0].id).not.toBe("");
  });

  // AC-SP1-2
  it("keeps the id of an item whose word was corrected", () => {
    const before = cleanPack(packWithItems([testItem({ id: "item-uno" })]));
    const corrected = cleanPack(
      packWithItems([testItem({ id: "item-uno", word: "PRUEBA unoo" })]),
    );

    expect(before.themes[0].items[0].id).toBe("item-uno");
    expect(corrected.themes[0].items[0].id).toBe("item-uno");
  });

  // AC-SP1-3
  it("is idempotent", () => {
    const messy = packWithItems([
      testItem({ id: "", word: "  PRUEBA uno  " }),
      testItem({ id: "repetido", word: "PRUEBA dos" }),
      testItem({ id: "repetido", word: "PRUEBA tres" }),
      testItem({ id: "", word: "", translation: "" }),
    ]);
    const once = cleanPack(messy);

    expect(cleanPack(once)).toEqual(once);
  });

  it("trims text and drops items with neither word nor translation", () => {
    const cleaned = cleanPack(
      packWithItems([
        testItem({ word: "  PRUEBA uno ", translation: " uno de prueba  " }),
        testItem({ id: "vacio", word: "   ", translation: "" }),
      ]),
    );

    expect(cleaned.themes[0].items).toHaveLength(1);
    expect(cleaned.themes[0].items[0].word).toBe("PRUEBA uno");
    expect(cleaned.themes[0].items[0].translation).toBe("uno de prueba");
  });

  it("renames a repeated id and keeps the first one", () => {
    const cleaned = cleanPack(
      packWithItems([
        testItem({ id: "repetido", word: "PRUEBA uno" }),
        testItem({ id: "repetido", word: "PRUEBA dos" }),
      ]),
    );
    const ids = cleaned.themes[0].items.map((item) => item.id);

    expect(ids[0]).toBe("repetido");
    expect(new Set(ids).size).toBe(2);
  });

  // AC-SP1-9
  it("stores composed and decomposed accents as the same text", () => {
    const decomposed = "PRUEBA á"; // a + combining acute
    const composed = "PRUEBA á"; // á

    const cleaned = cleanPack(packWithItems([testItem({ word: decomposed })]));

    expect(cleaned.themes[0].items[0].word).toBe(composed);
  });

  it("does not change the input", () => {
    const pack = packWithItems([testItem({ id: "", word: " PRUEBA uno " })]);
    const copy = structuredClone(pack);

    cleanPack(pack);

    expect(pack).toEqual(copy);
  });
});

describe("normalizeWord", () => {
  // AC-SP1-9
  it("treats á and a + combining acute as the same letter", () => {
    expect(normalizeWord("PRUEBA á")).toBe(normalizeWord("PRUEBA á"));
  });

  it("ignores case and surrounding spaces", () => {
    expect(normalizeWord("  PRUEBA Uno ")).toBe(normalizeWord("prueba uno"));
  });
});
