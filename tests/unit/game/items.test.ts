import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/dictionary";
import { buildItems } from "@/lib/game/items";
import type { Item } from "@/lib/game/types";

import { entry, example, fillers } from "./fixtures";

/** The rendered sentence, with the blank written out. */
function render(item: Item): string {
  return item.tokens.map((token) => token ?? "___").join(" ");
}

function only(entries: Parameters<typeof buildItems>[0]): Item {
  const items = buildItems(entries);

  expect(items).toHaveLength(1);

  return items[0];
}

describe("buildItems", () => {
  // AC-G1-2, AC-G1-8
  it("blanks the headword and leaves exactly one gap", () => {
    const item = only([
      entry({
        word: "kaniri",
        translations: ["yuca"],
        examples: [
          example("Nokoi kaniri kipatsiki", "Quiero yuca en la tierra"),
        ],
      }),
      ...fillers.filter((filler) => filler.word !== "kaniri"),
    ]);

    expect(item.tokens.filter((token) => token === null)).toHaveLength(1);
    expect(render(item)).toBe("Nokoi ___ kipatsiki");
    expect(item.answer).toBe("kaniri");
  });

  // AC-G1-8
  it("blanks only the first occurrence when the word repeats", () => {
    const item = only([
      entry({
        word: "shima",
        translations: ["pez"],
        examples: [example("Shima jeri shima okantakota")],
      }),
      ...fillers.filter((filler) => filler.word !== "shima"),
    ]);

    expect(render(item)).toBe("___ jeri shima okantakota");
  });

  // AC-G1-5 — a two-word lexeme is one blank, not two.
  it("covers a multi-word headword with a single blank", () => {
    const item = only([
      entry({
        word: "apiapitachari ñantsi",
        translations: ["palabra repetida"],
        examples: [example("Isankenajeiti apiapitachari ñantsi maroni")],
      }),
      ...fillers,
    ]);

    expect(item.tokens.filter((token) => token === null)).toHaveLength(1);
    expect(render(item)).toBe("Isankenajeiti ___ maroni");
    expect(item.answer).toBe("apiapitachari ñantsi");
  });

  // AC-G1-6 — the agglutinated case: the word is inside another token, which
  // is not the word. Forcing a match here would blank something else.
  it("drops an example whose headword never appears as a whole token", () => {
    expect(
      buildItems([
        entry({
          word: "monkararo",
          translations: ["medida"],
          examples: [
            example("Pintsipariayetero monkararijaniki añatyayetantyari"),
          ],
        }),
        ...fillers,
      ]),
    ).toEqual([]);
  });

  // AC-G1-7 — blanking one of two words leaves a trivial cue.
  it("drops a sentence shorter than three words", () => {
    expect(
      buildItems([
        entry({
          word: "kaniri",
          translations: ["yuca"],
          examples: [example("Pamenero kaniri")],
        }),
        ...fillers.filter((filler) => filler.word !== "kaniri"),
      ]),
    ).toEqual([]);
  });

  // AC-G1-10
  it("matches across case and diacritics but keeps ñ distinct from n", () => {
    const matched = only([
      entry({
        word: "ñaaka",
        translations: ["casa"],
        examples: [example("Ora ÑAÁKA okantakota kametsa")],
      }),
      ...fillers,
    ]);

    expect(render(matched)).toBe("Ora ___ okantakota kametsa");

    expect(
      buildItems([
        entry({
          word: "ñaaka",
          translations: ["casa"],
          examples: [example("Ora naaka okantakota kametsa")],
        }),
        ...fillers,
      ]),
    ).toEqual([]);
  });

  it("matches a variant spelling as well as the canonical word", () => {
    const item = only([
      entry({
        word: "kija",
        variants: ["kiya"],
        translations: ["agua"],
        examples: [example("Nokoi kiya osheki kametsa")],
      }),
      ...fillers,
    ]);

    expect(render(item)).toBe("Nokoi ___ osheki kametsa");
    // The tile shows the dictionary's canonical form, not the variant.
    expect(item.answer).toBe("kija");
  });

  it("keeps the punctuation that rides on the blanked word", () => {
    const item = only([
      entry({
        word: "kaniri",
        translations: ["yuca"],
        examples: [example("¿Jaoka ojitari kaniri?")],
      }),
      ...fillers.filter((filler) => filler.word !== "kaniri"),
    ]);

    expect(render(item)).toBe("¿Jaoka ojitari ___ ?");
    expect(item.answer).toBe("kaniri");
  });

  it("carries the prompt, the gloss and the source of the sentence", () => {
    const item = only([
      entry({
        word: "kaniri",
        translations: ["yuca", "mandioca"],
        examples: [
          example("Nokoi kaniri kipatsiki", "Quiero yuca en la tierra"),
        ],
      }),
      ...fillers.filter((filler) => filler.word !== "kaniri"),
    ]);

    expect(item.prompt).toBe("Quiero yuca en la tierra");
    expect(item.answerTranslation).toBe("yuca, mandioca");
    expect(item.sourceId).toBe("test-source");
    expect(item.id).toBe("kaniri:0");
  });

  it("drops a sentence with no source to cite", () => {
    expect(
      buildItems([
        entry({
          word: "kaniri",
          translations: ["yuca"],
          sourceId: undefined,
          examples: [
            { sentence: "Nokoi kaniri kipatsiki", translation: "Quiero yuca" },
          ],
        }),
        ...fillers.filter((filler) => filler.word !== "kaniri"),
      ]),
    ).toEqual([]);
  });

  it("gives each example of an entry its own item", () => {
    const items = buildItems([
      entry({
        word: "kaniri",
        translations: ["yuca"],
        examples: [
          example("Nokoi kaniri kipatsiki"),
          example("Ora kaniri okantakota kametsa"),
        ],
      }),
      ...fillers.filter((filler) => filler.word !== "kaniri"),
    ]);

    expect(items.map((item) => item.id)).toEqual(["kaniri:0", "kaniri:1"]);
  });
});

describe("buildItems distractors", () => {
  const target = entry({
    word: "kaniri",
    translations: ["yuca"],
    examples: [example("Nokoi kaniri kipatsiki")],
  });

  // AC-G1-3
  it("never offers the answer as a distractor", () => {
    const item = only([target, ...fillers.filter((f) => f.word !== "kaniri")]);

    expect(item.distractors).toHaveLength(2);
    expect(item.distractors).not.toContain(item.answer);
    expect(new Set(item.distractors).size).toBe(2);
  });

  // AC-G1-4 — a distractor that means the same thing makes the item unsolvable.
  it("excludes a candidate that shares a gloss with the answer", () => {
    const item = only([
      target,
      entry({ word: "kaniripaye", translations: ["Yuca"] }),
      ...fillers.filter((filler) => filler.word !== "kaniri"),
    ]);

    expect(item.distractors).not.toContain("kaniripaye");
  });

  it("drops the item when fewer than two candidates survive the filter", () => {
    expect(
      buildItems([
        target,
        entry({ word: "kaniripaye", translations: ["yuca"] }),
        entry({ word: "kaniriite", translations: ["YUCA"] }),
      ]),
    ).toEqual([]);
  });

  // AC-G1-4 — preferences, in the order the spec relaxes them.
  it("prefers candidates of the same part of speech", () => {
    const item = only([
      entry({
        word: "kaniri",
        partOfSpeech: "noun",
        translations: ["yuca"],
        examples: [example("Nokoi kaniri kipatsiki")],
      }),
      entry({
        word: "kenkitsatakantsi",
        partOfSpeech: "verb",
        translations: ["contar"],
      }),
      entry({
        word: "ashitakotantsi",
        partOfSpeech: "verb",
        translations: ["cerrar"],
      }),
      entry({ word: "shima", partOfSpeech: "noun", translations: ["pez"] }),
      entry({ word: "inchato", partOfSpeech: "noun", translations: ["árbol"] }),
    ]);

    expect([...item.distractors].sort()).toEqual(["inchato", "shima"]);
  });

  it("prefers candidates with as many words as the answer", () => {
    const item = only([
      entry({
        word: "apiapitachari ñantsi",
        partOfSpeech: "noun",
        translations: ["palabra repetida"],
        examples: [example("Isankenajeiti apiapitachari ñantsi maroni")],
      }),
      entry({
        word: "apitetirori yotaneri",
        partOfSpeech: "noun",
        translations: ["segundo saber"],
      }),
      entry({
        word: "kari añatsine",
        partOfSpeech: "noun",
        translations: ["lo no visible"],
      }),
      entry({ word: "shima", partOfSpeech: "noun", translations: ["pez"] }),
      entry({ word: "inchato", partOfSpeech: "noun", translations: ["árbol"] }),
    ]);

    expect([...item.distractors].sort()).toEqual([
      "apitetirori yotaneri",
      "kari añatsine",
    ]);
  });

  it("relaxes the preferences rather than dropping the item", () => {
    const item = only([
      entry({
        word: "kaniri",
        partOfSpeech: "noun",
        translations: ["yuca"],
        examples: [example("Nokoi kaniri kipatsiki")],
      }),
      // Nothing shares its part of speech, so the rule has to give way.
      entry({
        word: "kenkitsatakantsi",
        partOfSpeech: "verb",
        translations: ["contar"],
      }),
      entry({
        word: "ashitakotantsi",
        partOfSpeech: "verb",
        translations: ["cerrar"],
      }),
    ]);

    expect([...item.distractors].sort()).toEqual([
      "ashitakotantsi",
      "kenkitsatakantsi",
    ]);
  });

  it("never relaxes the gloss filter, even with nothing else left", () => {
    // Both candidates mean the same as the answer: the item cannot be fair.
    expect(
      buildItems([
        entry({
          word: "kaniri",
          partOfSpeech: "noun",
          translations: ["yuca"],
          examples: [example("Nokoi kaniri kipatsiki")],
        }),
        entry({
          word: "kaniripaye",
          partOfSpeech: "noun",
          translations: ["yuca"],
        }),
        entry({
          word: "kaniriite",
          partOfSpeech: "noun",
          translations: ["yuca"],
        }),
      ]),
    ).toEqual([]);
  });

  it("only ever offers real words from other entries", () => {
    const items = buildItems([
      target,
      ...fillers.filter((f) => f.word !== "kaniri"),
    ]);
    const words = new Set(fillers.map((filler) => filler.word));

    for (const distractor of items[0].distractors) {
      expect(words).toContain(distractor);
    }
  });

  // AC-G1-9
  it("is deterministic across calls", () => {
    const entries = [target, ...fillers.filter((f) => f.word !== "kaniri")];

    expect(buildItems(entries)).toEqual(buildItems(entries));
  });

  it("does not give every item the same pair of distractors", () => {
    const entries = [
      entry({
        word: "kaniri",
        translations: ["yuca"],
        examples: [
          example("Nokoi kaniri kipatsiki"),
          example("Ora kaniri okantakota kametsa"),
          example("Pamenero kaniri osheki kametsa"),
        ],
      }),
      ...fillers.filter((filler) => filler.word !== "kaniri"),
      entry({ word: "tsimeri", translations: ["ave"] }),
      entry({ word: "otishi", translations: ["cerro"] }),
    ];
    const pairs = buildItems(entries).map((item) =>
      [...item.distractors].sort().join("|"),
    );

    expect(new Set(pairs).size).toBeGreaterThan(1);
  });
});

// AC-G1-1 — the only test that reads the shipped dictionary. It guards the
// size of the pool, which is the one property adding words must not break.
describe("the real Asháninka pool", () => {
  const dictionary = getDictionary("ashaninka");

  it("exists", () => {
    expect(dictionary).not.toBeNull();
  });

  it("generates enough items for a dozen lessons", () => {
    const items = buildItems(dictionary!.entries);

    expect(items.length).toBeGreaterThanOrEqual(100);
    expect(items).toHaveLength(148);
  });

  it("gives every item a gap, an answer, two distractors and a source", () => {
    for (const item of buildItems(dictionary!.entries)) {
      expect(item.tokens.filter((token) => token === null)).toHaveLength(1);
      expect(item.answer).not.toBe("");
      expect(item.distractors).toHaveLength(2);
      expect(item.distractors).not.toContain(item.answer);
      expect(item.sourceId).not.toBe("");
      expect(item.prompt).not.toBe("");
    }
  });
});
