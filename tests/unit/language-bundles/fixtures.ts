import type { BundleEntry, LanguageBundle } from "@/lib/language-bundles/types";

// Words marked PRUEBA, never real Asháninka or Uro (spec §13).

export function testEntry(overrides: Partial<BundleEntry> = {}): BundleEntry {
  return {
    id: "prueba-uno",
    word: "pato",
    translations: ["PRUEBA uno"],
    emoji: "🦆",
    sourceId: "fuente-prueba",
    verified: true,
    ...overrides,
  };
}

/** A small bundle whose alphabet covers the test words below. */
export function testBundle(
  overrides: Partial<LanguageBundle> = {},
): LanguageBundle {
  return {
    schema: "language-bundle/1",
    language: "uro",
    translationLabel: "castellano",
    alphabet: {
      graphemes: ["a", "e", "i", "o", "p", "t", "s", "ch", "m", "n"],
      vowels: ["a", "e", "i", "o"],
      sourceId: "fuente-prueba",
    },
    sources: [
      {
        id: "fuente-prueba",
        kind: "publication",
        title: "Fuente de PRUEBA",
        url: "https://example.org/prueba",
      },
    ],
    entries: [
      testEntry(),
      testEntry({
        id: "prueba-dos",
        word: "mesa",
        translations: ["PRUEBA dos"],
        emoji: "🪑",
      }),
      testEntry({
        id: "prueba-tres",
        word: "pino",
        translations: ["PRUEBA tres"],
        emoji: "🌲",
        examples: [{ sentence: "un pino alto", translation: "PRUEBA" }],
      }),
    ],
    themes: [
      {
        id: "tema-prueba",
        name: "Tema de PRUEBA",
        icon: "🧪",
        mode: "pic2word",
        entryIds: ["prueba-uno", "prueba-dos", "prueba-tres"],
      },
    ],
    ...overrides,
  };
}
