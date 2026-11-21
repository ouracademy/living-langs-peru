import { describe, expect, it } from "vitest";

import { playableThemes } from "@/lib/language-packs/playable";
import type { PackItem } from "@/lib/language-packs/types";
import { MAX_REQUEUES, ROUND_SIZE } from "@/lib/word-jump/constants";
import {
  answerQuestion,
  buildRound,
  createRound,
  nextQuestion,
  roundOutcomes,
  type RoundState,
} from "@/lib/word-jump/round";

import { testItem, testPack, testTheme } from "../language-packs/fixtures";

const EMOJIS = [
  "🍎",
  "🐶",
  "🌳",
  "🐟",
  "🌙",
  "⭐",
  "🔥",
  "💧",
  "🌽",
  "🐦",
  "🪨",
  "🦋",
];

function manyItems(count: number): PackItem[] {
  return Array.from({ length: count }, (_, index) =>
    testItem({
      id: `item-${index}`,
      word: `PRUEBA ${index}`,
      translation: `prueba ${index}`,
      emoji: EMOJIS[index],
    }),
  );
}

function context(count = 4) {
  const pack = testPack({ themes: [testTheme({ items: manyItems(count) })] });
  const playable = playableThemes(pack);
  return { theme: playable[0], playable };
}

function wrongIndex(state: RoundState): number {
  return state.question!.answerIndex === 0 ? 1 : 0;
}

describe("createRound", () => {
  it("starts on the first item with its question", () => {
    const ctx = context();
    const state = createRound(ctx.theme.items, ctx, 42);

    expect(state.status).toBe("playing");
    expect(state.current?.id).toBe(ctx.theme.items[0].id);
    expect(state.question?.itemId).toBe(ctx.theme.items[0].id);
    expect(state.total).toBe(4);
  });

  it("is finished at once with no items", () => {
    const ctx = context();
    expect(createRound([], ctx, 1).status).toBe("finished");
  });
});

describe("answerQuestion and nextQuestion", () => {
  it("clears an item answered right and moves on after «Seguir»", () => {
    const ctx = context();
    let state = createRound(ctx.theme.items, ctx, 42);
    const first = state.current!.id;

    state = answerQuestion(state, state.question!.answerIndex);
    expect(state.feedback).toMatchObject({ correct: true, revealed: false });
    expect(state.cleared).toEqual([first]);

    state = nextQuestion(state, ctx);
    expect(state.feedback).toBeNull();
    expect(state.current?.id).not.toBe(first);
  });

  it("ignores a second answer while the feedback is showing", () => {
    const ctx = context();
    const answered = answerQuestion(createRound(ctx.theme.items, ctx, 42), 0);

    expect(answerQuestion(answered, 1)).toBe(answered);
  });

  // AC-SP4-4 (engine side): the answer is shown and the item comes back.
  it("requeues a missed item at the end and shows the answer", () => {
    const ctx = context();
    let state = createRound(ctx.theme.items, ctx, 42);
    const missed = state.current!.id;

    state = answerQuestion(state, wrongIndex(state));
    expect(state.feedback).toMatchObject({ correct: false, revealed: false });
    expect(state.feedback?.item.id).toBe(missed);
    expect(state.queue.at(-1)?.id).toBe(missed);
  });

  // AC-SP2-6
  it("takes an item out with the answer shown after the third miss", () => {
    const ctx = context(3);
    let state = createRound(ctx.theme.items.slice(0, 1), ctx, 42);
    const only = state.current!.id;

    for (let attempt = 0; attempt <= MAX_REQUEUES; attempt++) {
      expect(state.current?.id).toBe(only);
      state = answerQuestion(state, wrongIndex(state));
      state = nextQuestion(state, ctx);
    }

    expect(state.status).toBe("finished");
    expect(state.revealed).toEqual([only]);
    expect(state.cleared).toEqual([]);
  });

  // AC-SP2-7
  it("ends a round of ten in at most thirty answers, even always wrong", () => {
    const ctx = context(10);
    let state = createRound(ctx.theme.items, ctx, 7);

    while (state.status === "playing") {
      state = answerQuestion(state, wrongIndex(state));
      state = nextQuestion(state, ctx);
    }

    expect(state.answers).toBeLessThanOrEqual(30);
    expect(state.answers).toBe(10 * (1 + MAX_REQUEUES));
    expect(state.revealed).toHaveLength(10);
  });
});

describe("roundOutcomes", () => {
  it("tells first-try hits from missed and revealed items", () => {
    const ctx = context();
    let state = createRound(ctx.theme.items.slice(0, 2), ctx, 42);
    const [first, second] = [ctx.theme.items[0].id, ctx.theme.items[1].id];

    // First item: right at once. Second: wrong once, then right.
    state = nextQuestion(
      answerQuestion(state, state.question!.answerIndex),
      ctx,
    );
    state = nextQuestion(answerQuestion(state, wrongIndex(state)), ctx);
    state = nextQuestion(
      answerQuestion(state, state.question!.answerIndex),
      ctx,
    );

    expect(state.status).toBe("finished");
    expect(roundOutcomes(state)).toEqual([
      { itemId: first, misses: 0, correctFirstTry: true, revealed: false },
      { itemId: second, misses: 1, correctFirstTry: false, revealed: false },
    ]);
  });
});

describe("buildRound", () => {
  // AC-SP2-8
  it("puts the items never answered right first", () => {
    const items = manyItems(12);
    const stats = Object.fromEntries(
      items.slice(0, 9).map((item) => [
        item.id,
        {
          seen: 3,
          correctFirstTry: 2,
          missed: 0,
          lastSeenAt: "2026-11-01T00:00:00Z",
        },
      ]),
    );
    const neverRight = items.slice(9).map((item) => item.id);

    const round = buildRound(items, stats, 5);

    expect(
      round
        .slice(0, 3)
        .map((item) => item.id)
        .sort(),
    ).toEqual([...neverRight].sort());
  });

  it("puts the most missed before the rest", () => {
    const items = manyItems(4);
    const known = {
      seen: 2,
      correctFirstTry: 1,
      lastSeenAt: "2026-11-01T00:00:00Z",
    };
    const stats = {
      [items[0].id]: { ...known, missed: 0 },
      [items[1].id]: { ...known, missed: 1 },
      [items[2].id]: { ...known, missed: 4 },
      [items[3].id]: { ...known, missed: 0 },
    };

    const round = buildRound(items, stats, 5).map((item) => item.id);

    expect(round.slice(0, 2)).toEqual([items[2].id, items[1].id]);
  });

  it(`caps the round at ${ROUND_SIZE} and is shorter with fewer items`, () => {
    expect(buildRound(manyItems(12), {}, 1)).toHaveLength(ROUND_SIZE);
    expect(buildRound(manyItems(4), {}, 1)).toHaveLength(4);
  });

  it("is the same for the same seed", () => {
    const items = manyItems(12);
    expect(buildRound(items, {}, 9)).toEqual(buildRound(items, {}, 9));
  });
});

describe("rounds of the letter modes", () => {
  it("asks first-letter questions with the language's graphemes", () => {
    const pack = testPack({ themes: [testTheme({ mode: "first" })] });
    const playable = playableThemes(pack);
    const context = {
      theme: playable[0],
      playable,
      rules: pack.language,
    };

    const state = createRound(playable[0].items, context, 11);

    expect(state.question?.mode).toBe("first");
    expect(state.question?.options[state.question.answerIndex].text).toBe("p");
  });
});
