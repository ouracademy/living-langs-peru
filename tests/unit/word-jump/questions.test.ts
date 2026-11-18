import { describe, expect, it } from "vitest";

import { mulberry32 } from "@/lib/game/random";
import { normalizeWord } from "@/lib/language-packs/clean";
import { playableThemes } from "@/lib/language-packs/playable";
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
      option.itemId.startsWith("otro-"),
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
