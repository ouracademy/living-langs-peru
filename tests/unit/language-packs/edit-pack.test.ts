import { describe, expect, it } from "vitest";

import {
  addItem,
  anchorTarget,
  checkItemFields,
  filterItems,
  removeItem,
  updateItem,
  verifyTheme,
} from "@/lib/language-packs/edit-pack";
import { itemAnchor } from "@/lib/language-packs/pack-file";
import type { LanguagePack } from "@/lib/language-packs/types";

import { testItem, testPack, testTheme } from "./fixtures";

/** The same word in two themes, with a different id in each, as after an import. */
function twoThemes(): LanguagePack {
  return testPack({
    themes: [
      testTheme(),
      testTheme({
        id: "tema-letras",
        name: "Letras de prueba",
        mode: "first",
        items: [
          testItem({ id: "item-uno-2", verified: false }),
          testItem({
            id: "item-solo",
            word: "PRUEBA sola",
            translation: "sola de prueba",
            emoji: undefined,
            verified: false,
          }),
        ],
      }),
    ],
  });
}

const theme = (pack: LanguagePack, id: string) =>
  pack.themes.find((candidate) => candidate.id === id);
const item = (pack: LanguagePack, themeId: string, itemId: string) =>
  theme(pack, themeId)?.items.find((candidate) => candidate.id === itemId);

describe("updateItem", () => {
  // AC-SP6b-2
  it("changes the same word in every theme, keeping every id", () => {
    const pack = updateItem(twoThemes(), "tema-prueba", "item-uno", {
      emoji: "🍐",
      translation: "uno corregido",
    });

    expect(item(pack, "tema-prueba", "item-uno")).toMatchObject({
      emoji: "🍐",
      translation: "uno corregido",
    });
    expect(item(pack, "tema-letras", "item-uno-2")).toMatchObject({
      emoji: "🍐",
      translation: "uno corregido",
    });
    expect(item(pack, "tema-prueba", "item-dos")?.emoji).toBe("🐶");
  });

  it("renames the word everywhere without changing its id", () => {
    const pack = updateItem(twoThemes(), "tema-letras", "item-uno-2", {
      word: "PRUEBA uno bis",
    });

    expect(item(pack, "tema-prueba", "item-uno")?.word).toBe("PRUEBA uno bis");
    expect(item(pack, "tema-letras", "item-uno-2")?.word).toBe(
      "PRUEBA uno bis",
    );
  });

  // AC-SP6b-3
  it("unverifies the word in every theme", () => {
    const pack = updateItem(twoThemes(), "tema-prueba", "item-uno", {
      verified: false,
    });

    expect(item(pack, "tema-prueba", "item-uno")?.verified).toBe(false);
    expect(item(pack, "tema-letras", "item-uno-2")?.verified).toBe(false);
  });

  it("drops the emoji when it is emptied", () => {
    const pack = updateItem(twoThemes(), "tema-prueba", "item-dos", {
      emoji: "  ",
    });

    expect(item(pack, "tema-prueba", "item-dos")).not.toHaveProperty("emoji");
  });

  it("returns the pack unchanged for an unknown item", () => {
    const original = twoThemes();
    expect(
      updateItem(original, "tema-prueba", "no-existe", { emoji: "🍐" }),
    ).toEqual(original);
  });

  it("does not mutate the pack it was given", () => {
    const original = twoThemes();
    const copy = structuredClone(original);
    updateItem(original, "tema-prueba", "item-uno", { emoji: "🍐" });
    expect(original).toEqual(copy);
  });
});

describe("verifyTheme", () => {
  // AC-SP6b-4
  it("verifies every word of the theme, and the same words elsewhere", () => {
    const { pack, changed } = verifyTheme(twoThemes(), "tema-letras");

    expect(changed).toBe(2);
    expect(theme(pack, "tema-letras")?.items.every((i) => i.verified)).toBe(
      true,
    );
    expect(item(pack, "tema-prueba", "item-uno")?.verified).toBe(true);
  });

  it("changes nothing when the theme is already verified", () => {
    const { changed } = verifyTheme(twoThemes(), "tema-prueba");
    expect(changed).toBe(0);
  });
});

describe("addItem and removeItem", () => {
  // AC-SP6b-6
  it("adds a word to one theme with a new id given by cleanPack", () => {
    const { pack, itemId } = addItem(twoThemes(), "tema-letras", {
      word: " PRUEBA nueva ",
      translation: "nueva de prueba",
      emoji: "",
      sourceId: "fuente-prueba",
      verified: false,
    });

    const added = item(pack, "tema-letras", itemId);
    expect(added).toMatchObject({
      word: "PRUEBA nueva",
      translation: "nueva de prueba",
      sourceId: "fuente-prueba",
      verified: false,
    });
    expect(added).not.toHaveProperty("emoji");
    expect(itemId).not.toBe("");
    expect(theme(pack, "tema-prueba")?.items).toHaveLength(4);
  });

  it("removes a word from one theme only", () => {
    const pack = removeItem(twoThemes(), "tema-letras", "item-uno-2");

    expect(item(pack, "tema-letras", "item-uno-2")).toBeUndefined();
    expect(item(pack, "tema-prueba", "item-uno")).toBeDefined();
  });
});

describe("checkItemFields", () => {
  const letters = twoThemes().themes[1];

  // AC-SP6b-5
  it("asks for the word and the translation", () => {
    expect(
      checkItemFields({ word: " ", translation: "", emoji: "" }, letters),
    ).toEqual({
      word: "Escribe la palabra.",
      translation: "Escribe la traducción.",
    });
  });

  it("accepts an empty emoji and refuses text as an emoji", () => {
    const fields = { word: "PRUEBA x", translation: "x" };
    expect(checkItemFields({ ...fields, emoji: "" }, letters)).toEqual({});
    expect(checkItemFields({ ...fields, emoji: "pez" }, letters).emoji).toMatch(
      /emoji/,
    );
    expect(
      checkItemFields({ ...fields, emoji: "🍎🍎🍎🍎🍎🍎🍎🍎🍎" }, letters)
        .emoji,
    ).toMatch(/emoji/);
  });

  it("refuses a word already in the theme, except the one being edited", () => {
    const fields = { word: "prueba SOLA", translation: "x", emoji: "" };
    expect(checkItemFields(fields, letters).word).toMatch(/Ya hay/);
    expect(checkItemFields(fields, letters, "item-solo")).toEqual({});
  });
});

describe("filterItems", () => {
  const items = twoThemes().themes[1].items;

  // AC-SP6b-7
  it("searches the word and the translation, ignoring case and accents", () => {
    expect(
      filterItems(items, { query: "SÓLA", unverified: false, noEmoji: false }),
    ).toHaveLength(1);
    expect(
      filterItems(items, {
        query: "uno de",
        unverified: false,
        noEmoji: false,
      }),
    ).toHaveLength(1);
  });

  it("keeps only the unverified or the ones without a picture", () => {
    expect(
      filterItems(items, { query: "", unverified: false, noEmoji: true }).map(
        (i) => i.id,
      ),
    ).toEqual(["item-solo"]);
    expect(
      filterItems(items, { query: "", unverified: true, noEmoji: false }),
    ).toHaveLength(2);
  });
});

describe("anchorTarget", () => {
  const pack = twoThemes();

  it("finds the theme and item of an issue link", () => {
    expect(
      anchorTarget(pack, `#${itemAnchor("tema-letras", "item-solo")}`),
    ).toEqual({ themeId: "tema-letras", itemId: "item-solo" });
    expect(anchorTarget(pack, `#${itemAnchor("tema-letras")}`)).toEqual({
      themeId: "tema-letras",
    });
  });

  it("ignores any other hash", () => {
    expect(anchorTarget(pack, "#galeria")).toBeNull();
    expect(anchorTarget(pack, "")).toBeNull();
  });
});
