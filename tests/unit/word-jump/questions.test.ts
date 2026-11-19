import { describe, expect, it } from "vitest";

import { mulberry32 } from "@/lib/game/random";
import { normalizeWord } from "@/lib/language-packs/clean";
import { playableThemes } from "@/lib/language-packs/playable";
import type { LanguagePack, PackItem } from "@/lib/language-packs/types";
import { buildQuestion } from "@/lib/word-jump/questions";

import { testItem, testPack, testTheme } from "../language-packs/fixtures";

function setup(pack = testPack()) {
  const playable = playableThemes(pack);
  return { playable, theme: playable[0] };
}

describe("buildQuestion (pic2word)", () => {
  // AC-SP2-1
  it("gives the same question for the same seed", () => {
    const { playable, theme } = setup();
    const item = theme.items[0];

    expect(buildQuestion(item, theme, playable, mulberry32(7))).toEqual(
      buildQuestion(item, theme, playable, mulberry32(7)),
    );
  });

  // AC-SP2-1
  it("gives another order for another seed", () => {
    const { playable, theme } = setup();
    const item = theme.items[0];
    const orders = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
        buildQuestion(item, theme, playable, mulberry32(seed))
          .options.map((option) => option.itemId)
          .join(","),
      ),
    );

    expect(orders.size).toBeGreaterThan(1);
  });

  it("asks with the emoji, named by the translation, and offers three words", () => {
    const { playable, theme } = setup();
    const item = theme.items[1];
    const question = buildQuestion(item, theme, playable, mulberry32(1));

    expect(question.prompt).toEqual({
      emoji: item.emoji,
      label: item.translation,
    });
    expect(question.options).toHaveLength(3);
    expect(question.options[question.answerIndex]).toEqual({
      itemId: item.id,
      text: item.word,
    });
  });

  // AC-SP2-2
  it("never offers the answer twice nor a word sharing its translation", () => {
    const base = testTheme();
    const pack = testPack({
      themes: [
        testTheme({
          items: [
            ...base.items,
            testItem({
              id: "misma-traduccion",
              word: "PRUEBA cinco",
              translation: "uno de prueba",
              emoji: "🍏",
            }),
            testItem({
              id: "misma-palabra",
              word: "prueba UNO",
              translation: "otra cosa",
              emoji: "🍐",
            }),
          ],
        }),
      ],
    });
    const { playable, theme } = setup(pack);
    const item = theme.items[0];

    for (let seed = 0; seed < 50; seed++) {
      const question = buildQuestion(item, theme, playable, mulberry32(seed));
      const distractors = question.options.filter(
        (_, index) => index !== question.answerIndex,
      );

      for (const option of distractors) {
        expect(normalizeWord(option.text)).not.toBe(normalizeWord(item.word));
        expect(option.itemId).not.toBe("misma-traduccion");
      }
    }
  });

  // AC-SP2-3
  it("takes distractors only from playable items", () => {
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
    const { playable, theme } = setup(pack);

    for (let seed = 0; seed < 50; seed++) {
      const question = buildQuestion(
        theme.items[0],
        theme,
        playable,
        mulberry32(seed),
      );
      expect(question.options.map((option) => option.itemId)).not.toContain(
        "oculto",
      );
    }
  });

  it("borrows distractors from another playable theme when one is short", () => {
    const [one, two, three] = testTheme().items;
    const pack = testPack({
      themes: [
        // Three distinct words, but two share a translation with `one`.
        testTheme({
          id: "corto",
          items: [
            one,
            { ...two, translation: one.translation },
            { ...three, translation: one.translation },
          ],
        }),
        testTheme({
          id: "otro",
          items: testTheme().items.map((item) => ({
            ...item,
            id: `otro-${item.id}`,
            word: `${item.word} bis`,
            translation: `${item.translation} bis`,
          })),
        }),
      ],
    });
    const playable = playableThemes(pack);
    const theme = playable[0];
    const question = buildQuestion(
      theme.items[0],
      theme,
      playable,
      mulberry32(3),
    );

    expect(question.options).toHaveLength(3);
    const borrowed = question.options.filter((option) =>
      option.itemId?.startsWith("otro-"),
    );
    expect(borrowed).toHaveLength(2);
  });

  // AC-SP2-9
  it("does not always put the answer in the same place", () => {
    const { playable, theme } = setup();
    const positions = new Set(
      Array.from(
        { length: 30 },
        (_, seed) =>
          buildQuestion(
            theme.items[seed % theme.items.length],
            theme,
            playable,
            mulberry32(seed),
          ).answerIndex,
      ),
    );

    expect(positions.size).toBe(3);
  });
});

/** The letter rules of the test pack, as the round passes them in. */
function rulesOf(pack = testPack()) {
  return pack.language;
}

/** Seeds 0..n-1, each with its own question. */
function questionsFor(
  pack: LanguagePack,
  pick: (items: PackItem[]) => PackItem,
  count = 40,
) {
  const playable = playableThemes(pack);
  const theme = playable[0];
  const item = pick(theme.items);
  return Array.from({ length: count }, (_, seed) =>
    buildQuestion(item, theme, playable, mulberry32(seed), rulesOf(pack)),
  );
}

describe("buildQuestion (word2pic)", () => {
  const pack = testPack({ themes: [testTheme({ mode: "word2pic" })] });

  it("shows the word and offers three different pictures named by their meaning", () => {
    const [question] = questionsFor(pack, (items) => items[1]);
    const item = testTheme().items[1];

    expect(question.mode).toBe("word2pic");
    expect(question.prompt).toEqual({ text: item.word });
    expect(question.optionsInLanguage).toBe(false);
    expect(question.options[question.answerIndex]).toEqual({
      itemId: item.id,
      text: item.emoji,
      label: item.translation,
    });
    expect(new Set(question.options.map((option) => option.text)).size).toBe(3);
  });

  // AC-SP2-2
  it("never offers a picture or a meaning equal to the answer's", () => {
    const base = testTheme({ mode: "word2pic" });
    const withTwins = testPack({
      themes: [
        testTheme({
          mode: "word2pic",
          items: [
            ...base.items,
            testItem({
              id: "mismo-dibujo",
              word: "PRUEBA cinco",
              translation: "cinco de prueba",
              emoji: base.items[0].emoji,
            }),
            testItem({
              id: "mismo-significado",
              word: "PRUEBA seis",
              translation: base.items[0].translation,
              emoji: "🐱",
            }),
          ],
        }),
      ],
    });

    for (const question of questionsFor(withTwins, (items) => items[0])) {
      const distractors = question.options.filter(
        (_, index) => index !== question.answerIndex,
      );
      for (const option of distractors) {
        expect(option.text).not.toBe(base.items[0].emoji);
        expect(option.itemId).not.toBe("mismo-significado");
      }
    }
  });
});

describe("buildQuestion (first)", () => {
  const pack = testPack({ themes: [testTheme({ mode: "first" })] });

  it("hides the initial and offers three graphemes, one of them right", () => {
    const [question] = questionsFor(pack, (items) => items[0]);

    expect(question.mode).toBe("first");
    expect(question.prompt).toEqual({
      emoji: "🍎",
      label: "uno de prueba",
      text: "＿RUEBA uno",
    });
    expect(question.optionsInLanguage).toBe(true);
    expect(question.options[question.answerIndex]).toEqual({ text: "p" });
    expect(new Set(question.options.map((option) => option.text)).size).toBe(3);
  });

  // AC-SP2-4
  it("prefers the confusable graphemes as distractors", () => {
    const base = testPack();
    const confusable = testPack({
      language: { ...base.language, confusable: { p: ["b", "r"] } },
      themes: [testTheme({ mode: "first" })],
    });

    for (const question of questionsFor(confusable, (items) => items[0])) {
      expect(question.options.map((option) => option.text).sort()).toEqual([
        "b",
        "p",
        "r",
      ]);
    }
  });

  // AC-SP2-1, AC-SP2-9
  it("is seeded and moves the answer around", () => {
    const questions = questionsFor(pack, (items) => items[0]);

    expect(questions[5]).toEqual(questionsFor(pack, (items) => items[0])[5]);
    expect(
      new Set(questions.map((question) => question.answerIndex)).size,
    ).toBe(3);
  });
});

describe("buildQuestion (vowel)", () => {
  const pack = testPack({ themes: [testTheme({ mode: "vowel" })] });

  it("hides exactly one vowel and offers the vowels of the language", () => {
    for (const question of questionsFor(pack, (items) => items[0])) {
      const text = question.prompt.text ?? "";
      expect(question.mode).toBe("vowel");
      expect([...text].filter((letter) => letter === "＿")).toHaveLength(1);
      expect(question.options.map((option) => option.text).sort()).toEqual([
        "a",
        "e",
        "i",
        "o",
      ]);
      const answer = question.options[question.answerIndex].text;
      // Putting the answer back gives the word again.
      expect(text.replace("＿", answer).toLowerCase()).toBe("prueba uno");
    }
  });

  it("hides different vowels with different seeds", () => {
    const hidden = new Set(
      questionsFor(pack, (items) => items[0]).map(
        (question) => question.prompt.text,
      ),
    );

    expect(hidden.size).toBeGreaterThan(1);
  });

  // AC-SP2-5
  it("folds a variant onto its vowel", () => {
    const base = testPack();
    const accented = testPack({
      language: { ...base.language, vowelVariants: { á: "a" } },
      themes: [
        testTheme({
          mode: "vowel",
          items: [testItem({ word: "prá" })],
        }),
      ],
    });

    for (const question of questionsFor(accented, (items) => items[0], 5)) {
      expect(question.prompt.text).toBe("pr＿");
      expect(question.options[question.answerIndex].text).toBe("a");
    }
  });

  it("offers at most four vowels, the answer always among them", () => {
    const base = testPack();
    const many = testPack({
      language: { ...base.language, vowels: ["a", "e", "i", "o", "u"] },
      themes: [testTheme({ mode: "vowel" })],
    });

    for (const question of questionsFor(many, (items) => items[0])) {
      expect(question.options.length).toBe(4);
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
    }
  });
});
