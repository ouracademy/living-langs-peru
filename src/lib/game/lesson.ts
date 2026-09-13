import { HEARTS, LESSON_SIZE } from "./constants";
import { orderOptions } from "./options";
import { mulberry32, shuffle } from "./random";
import type { Item } from "./types";

/**
 * The lesson, as a pure state machine.
 *
 * No clock, no randomness and no storage in here: the seed comes in as an
 * argument, which is what makes every rule below testable. The React side only
 * holds the state and renders it.
 */

export type LessonStatus = "playing" | "completed" | "failed";

export type AnswerState = {
  selected: string;
  correct: boolean;
};

export type LessonState = {
  /** Pending items, current one excluded. */
  queue: Item[];
  current: Item | null;
  /** The three tiles for `current`, already ordered. */
  options: string[];
  /** Correct answers. The numerator of the progress bar. */
  answered: number;
  /**
   * Ids of the items answered correctly. This, and not `answered`, is what
   * gets saved: progress has to know *which* words the player got right.
   */
  answeredIds: string[];
  /** Items the lesson asks for. The denominator of the progress bar. */
  total: number;
  hearts: number;
  /** Items missed at least once, for the summary. Each listed once. */
  missed: Item[];
  /** Non-null while the feedback for the last answer is showing. */
  answerState: AnswerState | null;
  status: LessonStatus;
  seed: number;
};

export function createLesson(items: Item[], seed: number): LessonState {
  const [current, ...queue] = items;

  return {
    queue,
    current: current ?? null,
    options: current ? orderOptions(current, seed) : [],
    answered: 0,
    answeredIds: [],
    total: items.length,
    hearts: HEARTS,
    missed: [],
    answerState: null,
    status: items.length > 0 ? "playing" : "completed",
    seed,
  };
}

export function answer(state: LessonState, word: string): LessonState {
  // Answering twice, or after the lesson is over, is not a move.
  if (state.status !== "playing" || state.answerState || !state.current) {
    return state;
  }

  const item = state.current;
  const correct = word === item.answer;
  const answerState: AnswerState = { selected: word, correct };

  if (correct) {
    return {
      ...state,
      answered: state.answered + 1,
      answeredIds: [...state.answeredIds, item.id],
      answerState,
      status: state.queue.length === 0 ? "completed" : "playing",
    };
  }

  const hearts = state.hearts - 1;
  const alreadyMissed = state.missed.some((missed) => missed.id === item.id);

  return {
    ...state,
    hearts,
    // Back to the end of the queue: a word you got wrong is the one worth
    // asking again. Hearts are what stop this from looping forever.
    queue: [...state.queue, item],
    missed: alreadyMissed ? state.missed : [...state.missed, item],
    answerState,
    status: hearts === 0 ? "failed" : "playing",
  };
}

/**
 * Dismisses the feedback and shows the next item.
 *
 * Deliberately a separate step from `answer`: reading the sentence with the
 * right word in it is the part that teaches, so nothing advances on its own.
 */
export function next(state: LessonState): LessonState {
  if (!state.answerState) return state;

  if (state.status !== "playing") {
    return { ...state, answerState: null, current: null, options: [] };
  }

  const [current, ...queue] = state.queue;

  return {
    ...state,
    queue,
    current: current ?? null,
    options: current ? orderOptions(current, state.seed) : [],
    answerState: null,
  };
}

/**
 * Picks the items for one lesson.
 *
 * Items never answered correctly come first: with a pool this size, spending
 * ten questions on words the player already knows is the wrong use of them.
 * Mastered items fill the rest, so a lesson is always full once the pool is
 * big enough — and once everything is mastered, the lesson simply repeats,
 * which is the accepted answer to a closed pool (specs §14, pregunta 4).
 */
export function buildLesson(
  pool: Item[],
  mastered: string[],
  seed: number,
): Item[] {
  const known = new Set(mastered);
  const random = mulberry32(seed);
  const fresh = shuffle(
    pool.filter((item) => !known.has(item.id)),
    random,
  );
  const seen = shuffle(
    pool.filter((item) => known.has(item.id)),
    random,
  );

  return [...fresh, ...seen].slice(0, LESSON_SIZE);
}
