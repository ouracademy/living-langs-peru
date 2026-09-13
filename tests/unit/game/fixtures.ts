import type { Entry } from "@/lib/dictionary";

/**
 * Hand-built entries, deliberately not real language data, so that adding
 * words to the shipped dictionary never breaks these tests. The one test that
 * reads the real dictionary is the pool-size guard.
 */
export function entry(partial: Partial<Entry> & { word: string }): Entry {
  return {
    id: partial.id ?? partial.word.toLowerCase().replaceAll(" ", "-"),
    translations: ["traducción"],
    examples: [],
    sourceId: "test-source",
    ...partial,
  };
}

export function example(sentence: string, translation = "una traducción") {
  return { sentence, translation, sourceId: "test-source" };
}

/**
 * Filler entries whose only job is to be available as distractors: enough of
 * them that the mandatory gloss filter always has two candidates left.
 */
export const fillers: Entry[] = [
  entry({ word: "kaniri", translations: ["yuca"] }),
  entry({ word: "shima", translations: ["pez"] }),
  entry({ word: "inchato", translations: ["árbol"] }),
  entry({ word: "kitaiteri", translations: ["día"] }),
];
