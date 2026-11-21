import { describe, expect, it } from "vitest";

import {
  SCORE_AFTER_MISS,
  SCORE_FIRST_TRY,
  advance,
  answer,
  createLevel,
  levelOutcomes,
  missedItems,
  solvedCount,
} from "@/lib/word-jump/platformer/game";
import type { RoundContext } from "@/lib/word-jump/round";

import { testTheme } from "../../language-packs/fixtures";

const theme = testTheme();
const context: RoundContext = { theme, playable: [theme] };

function level(seed = 7) {
  return createLevel(theme.items, context, seed);
}

/** Index of a wrong option of the current challenge. */
function wrongOption(state: ReturnType<typeof level>): number {
  const { question } = state.challenges[state.index];
  return question.answerIndex === 0 ? 1 : 0;
}

function rightOption(state: ReturnType<typeof level>): number {
  return state.challenges[state.index].question.answerIndex;
}

describe("createLevel", () => {
  it("asks one challenge per item, in order, reproducibly", () => {
    const state = level();
    expect(state.challenges.map((each) => each.item.id)).toEqual(
      theme.items.map((item) => item.id),
    );
    expect(state.index).toBe(0);
    expect(state.score).toBe(0);
    expect(state.status).toBe("playing");
    expect(level().challenges.map((each) => each.question)).toEqual(
      state.challenges.map((each) => each.question),
    );
  });

  it("is finished at once when there is nothing to ask", () => {
    expect(createLevel([], context, 1).status).toBe("finished");
  });
});

describe("answer", () => {
  // AC-SP4b-2
  it("solves the challenge and scores 10 on a first right answer", () => {
    const state = level();
    const after = answer(state, rightOption(state));
    expect(after.challenges[0].solved).toBe(true);
    expect(after.score).toBe(SCORE_FIRST_TRY);
    expect(after.last).toEqual({
      kind: "correct",
      challenge: 0,
      option: rightOption(state),
    });
  });

  // AC-SP4b-3
  it("crosses a wrong option and lets another be tried, then scores 5", () => {
    const state = level();
    const wrong = wrongOption(state);
    const missed = answer(state, wrong);
    expect(missed.challenges[0].crossed).toEqual([wrong]);
    expect(missed.challenges[0].solved).toBe(false);
    expect(missed.score).toBe(0);
    expect(missed.last?.kind).toBe("wrong");

    const solved = answer(missed, rightOption(state));
    expect(solved.score).toBe(SCORE_AFTER_MISS);
  });

  it("ignores a crossed option, a solved challenge and an unknown option", () => {
    const state = level();
    const missed = answer(state, wrongOption(state));
    expect(answer(missed, wrongOption(state))).toBe(missed);

    const solved = answer(state, rightOption(state));
    expect(answer(solved, wrongOption(state))).toBe(solved);
    expect(answer(state, 99)).toBe(state);
    expect(answer(state, -1)).toBe(state);
  });
});

describe("advance", () => {
  // AC-SP4b-4
  it("moves on only once the challenge is solved", () => {
    const state = level();
    expect(advance(state)).toBe(state);
    const next = advance(answer(state, rightOption(state)));
    expect(next.index).toBe(1);
    expect(next.last).toBeNull();
  });

  // AC-SP4b-5
  it("finishes after the last challenge, with what to review", () => {
    let state = level();
    state = answer(state, wrongOption(state));
    for (let step = 0; step < theme.items.length; step++) {
      state = advance(answer(state, rightOption(state)));
    }

    expect(state.status).toBe("finished");
    expect(solvedCount(state)).toBe(theme.items.length);
    expect(advance(state)).toBe(state);
    expect(answer(state, 0)).toBe(state);
    expect(missedItems(state).map((item) => item.id)).toEqual([
      theme.items[0].id,
    ]);
    expect(levelOutcomes(state)).toEqual(
      theme.items.map((item, index) => ({
        itemId: item.id,
        misses: index === 0 ? 1 : 0,
        correctFirstTry: index !== 0,
        revealed: false,
      })),
    );
  });
});
