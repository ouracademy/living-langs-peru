/**
 * A level as a pure state machine (spec §7.6, decision #22). Physics and
 * buttons dispatch the same `answer`; a wrong option is crossed out and the
 * challenge goes on, so it always ends with the right one.
 */
import { hash } from "../../game/hash.ts";
import { mulberry32 } from "../../game/random.ts";
import type { PackItem } from "../../language-packs/types.ts";
import { type Question, buildQuestion } from "../questions.ts";
import type { RoundContext, RoundOutcome } from "../round.ts";

export const SCORE_FIRST_TRY = 10;
export const SCORE_AFTER_MISS = 5;

export type Challenge = {
  item: PackItem;
  question: Question;
  /** Option indexes answered wrong, in order. */
  crossed: number[];
  solved: boolean;
};

export type LastAnswer = {
  kind: "correct" | "wrong";
  challenge: number;
  option: number;
};

export type LevelState = {
  challenges: Challenge[];
  index: number;
  score: number;
  status: "playing" | "finished";
  /** The last answer of the current challenge, for the status message. */
  last: LastAnswer | null;
};

export function createLevel(
  items: PackItem[],
  context: RoundContext,
  seed: number,
): LevelState {
  const challenges = items.map((item, index) => ({
    item,
    question: buildQuestion(
      item,
      context.theme,
      context.playable,
      mulberry32(hash(`${seed}:${index}`)),
      context.rules,
    ),
    crossed: [],
    solved: false,
  }));

  return {
    challenges,
    index: 0,
    score: 0,
    status: challenges.length > 0 ? "playing" : "finished",
    last: null,
  };
}

export function answer(state: LevelState, option: number): LevelState {
  const challenge = state.challenges[state.index];
  if (
    state.status !== "playing" ||
    !challenge ||
    challenge.solved ||
    option < 0 ||
    option >= challenge.question.options.length ||
    challenge.crossed.includes(option)
  ) {
    return state;
  }

  const correct = option === challenge.question.answerIndex;
  const updated: Challenge = correct
    ? { ...challenge, solved: true }
    : { ...challenge, crossed: [...challenge.crossed, option] };
  const points = correct
    ? challenge.crossed.length === 0
      ? SCORE_FIRST_TRY
      : SCORE_AFTER_MISS
    : 0;

  return {
    ...state,
    challenges: state.challenges.map((each, index) =>
      index === state.index ? updated : each,
    ),
    score: state.score + points,
    last: {
      kind: correct ? "correct" : "wrong",
      challenge: state.index,
      option,
    },
  };
}

/** Through the open door: the next challenge, or the finish. */
export function advance(state: LevelState): LevelState {
  if (state.status !== "playing" || !state.challenges[state.index]?.solved) {
    return state;
  }
  const index = state.index + 1;
  const finished = index >= state.challenges.length;

  return {
    ...state,
    index: finished ? state.index : index,
    status: finished ? "finished" : "playing",
    last: null,
  };
}

export function solvedCount(state: LevelState): number {
  return state.challenges.filter((challenge) => challenge.solved).length;
}

/** The same shape `round.ts` gives the progress, so stats.ts is unchanged. */
export function levelOutcomes(state: LevelState): RoundOutcome[] {
  return state.challenges.map((challenge) => ({
    itemId: challenge.item.id,
    misses: challenge.crossed.length,
    correctFirstTry: challenge.solved && challenge.crossed.length === 0,
    revealed: false,
  }));
}

/** For «Repasar las falladas»: the items with at least one wrong answer. */
export function missedItems(state: LevelState): PackItem[] {
  return state.challenges
    .filter((challenge) => challenge.crossed.length > 0)
    .map((challenge) => challenge.item);
}
