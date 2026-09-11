import type { Entry } from "@/lib/dictionary";

/**
 * Hand-built entries, deliberately not real language data. Unit tests use
 * these so that adding words to the shipped dictionary never breaks the suite.
 */
export function entry(partial: Partial<Entry> & { word: string }): Entry {
  return {
    id: partial.id ?? partial.word.toLowerCase().replaceAll(" ", "-"),
    translations: ["traducción"],
    examples: [],
    ...partial,
  };
}

export const entries: Entry[] = [
  entry({ id: "naaka", word: "ñaaka", translations: ["casa"] }),
  entry({ id: "peru", word: "Perú", translations: ["país"] }),
  entry({
    id: "kija",
    word: "kija",
    variants: ["kiya"],
    translations: ["agua", "río"],
  }),
];
