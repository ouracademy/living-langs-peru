import type { LanguagePack, PackItem, Theme } from "@/lib/language-packs/types";

/**
 * Test packs. Every word is marked PRUEBA: tests never carry real or invented
 * words in an Indigenous language (spec §13), and nothing here comes from
 * Supabase (AC-SP1-10).
 */
export function testItem(overrides: Partial<PackItem> = {}): PackItem {
  return {
    id: "item-uno",
    word: "PRUEBA uno",
    translation: "uno de prueba",
    emoji: "🍎",
    sourceId: "fuente-prueba",
    verified: true,
    ...overrides,
  };
}

export function testTheme(overrides: Partial<Theme> = {}): Theme {
  return {
    id: "tema-prueba",
    name: "Tema de prueba",
    icon: "🧪",
    mode: "pic2word",
    items: [
      testItem(),
      testItem({
        id: "item-dos",
        word: "PRUEBA dos",
        translation: "dos de prueba",
        emoji: "🐶",
      }),
      testItem({
        id: "item-tres",
        word: "PRUEBA tres",
        translation: "tres de prueba",
        emoji: "🌳",
      }),
      testItem({
        id: "item-cuatro",
        word: "PRUEBA cuatro",
        translation: "cuatro de prueba",
        emoji: "🐟",
      }),
    ],
    ...overrides,
  };
}

export function testPack(overrides: Partial<LanguagePack> = {}): LanguagePack {
  return {
    schema: "language-pack/1",
    language: {
      slug: "ashaninka",
      isoCode: "cni",
      name: "Asháninka",
      title: "PRUEBA paquete",
      vowels: ["a", "e", "i", "o"],
      graphemes: ["a", "e", "i", "o", "p", "r", "u", "b"],
      translationLabel: "castellano",
    },
    sources: [
      { id: "fuente-prueba", kind: "publication", title: "Fuente de prueba" },
    ],
    themes: [testTheme()],
    ...overrides,
  };
}
