import { hash } from "../game/hash.ts";
import { mulberry32, shuffle } from "../game/random.ts";
import type { PackItem, Theme } from "../language-packs/types.ts";
import { MAX_REQUEUES, ROUND_SIZE } from "./constants.ts";
import { buildQuestion, type Question } from "./questions.ts";
import type { LanguageProgress } from "./stats.ts";

/**
 * A round, as a pure state machine (spec §5.4). No clock, no randomness and no
 * storage in here: the seed comes in as an argument, as in completar-palabras.
 */

export type RoundContext = {
  theme: Theme;
  /** The output of `playableThemes`: where distractors may come from. */
  playable: Theme[];
};

export type Feedback = {
  selectedIndex: number;
  correct: boolean;
  /** Third miss: the answer is shown and the item leaves the round. */
  revealed: boolean;
  item: PackItem;
  question: Question;
};

export type RoundState = {
  /** Every item of the round, in the order it started. */
  items: PackItem[];
  /** Pending items, current one excluded. */
  queue: PackItem[];
  current: PackItem | null;
  question: Question | null;
  /** Misses per item id in this round. */
  misses: Record<string, number>;
  /** Ids answered right, in order. */
  cleared: string[];
  /** Ids whose answer was shown after the last allowed miss. */
  revealed: string[];
  /** Answers given. Bounded by items × (1 + MAX_REQUEUES) (AC-SP2-7). */
  answers: number;
  total: number;
  /** Non-null while the feedback for the last answer is showing. */
  feedback: Feedback | null;
  status: "playing" | "finished";
  seed: number;
};

export type RoundOutcome = {
  itemId: string;
  misses: number;
  correctFirstTry: boolean;
  revealed: boolean;
};

/** A different, reproducible random stream for every question of the round. */
function questionFor(
  item: PackItem,
  context: RoundContext,
  seed: number,
  step: number,
): Question {
  return buildQuestion(
    item,
    context.theme,
    context.playable,
    mulberry32(hash(`${seed}:${step}`)),
  );
}

export function createRound(
  items: PackItem[],
  context: RoundContext,
  seed: number,
): RoundState {
  const [current, ...queue] = items;

  return {
    items,
    queue,
    current: current ?? null,
    question: current ? questionFor(current, context, seed, 0) : null,
    misses: {},
    cleared: [],
    revealed: [],
    answers: 0,
    total: items.length,
    feedback: null,
    status: current ? "playing" : "finished",
    seed,
  };
}

export function answerQuestion(
  state: RoundState,
  selectedIndex: number,
): RoundState {
  // Answering twice, or with nothing asked, is not a move.
  if (
    state.status !== "playing" ||
    state.feedback ||
    !state.current ||
    !state.question
  ) {
    return state;
  }

  const item = state.current;
  const correct = selectedIndex === state.question.answerIndex;
  const misses = state.misses[item.id] ?? 0;

  if (correct) {
    return {
      ...state,
      answers: state.answers + 1,
      cleared: [...state.cleared, item.id],
      feedback: {
        selectedIndex,
        correct,
        revealed: false,
        item,
        question: state.question,
      },
    };
  }

  // A miss: back to the end of the queue while it has requeues left; after the
  // last one the answer is shown and it leaves the round (decision #11).
  const revealed = misses >= MAX_REQUEUES;

  return {
    ...state,
    answers: state.answers + 1,
    misses: { ...state.misses, [item.id]: misses + 1 },
    queue: revealed ? state.queue : [...state.queue, item],
    revealed: revealed ? [...state.revealed, item.id] : state.revealed,
    feedback: {
      selectedIndex,
      correct,
      revealed,
      item,
      question: state.question,
    },
  };
}

/** «Seguir»: closes the feedback and asks the next pending item. */
export function nextQuestion(
  state: RoundState,
  context: RoundContext,
): RoundState {
  if (!state.feedback) return state;

  const [current, ...queue] = state.queue;

  if (!current) {
    return {
      ...state,
      current: null,
      question: null,
      queue: [],
      feedback: null,
      status: "finished",
    };
  }

  return {
    ...state,
    current,
    queue,
    question: questionFor(current, context, state.seed, state.answers),
    feedback: null,
  };
}

/** What the round leaves behind for the progress (spec §5.5). */
export function roundOutcomes(state: RoundState): RoundOutcome[] {
  return state.items.map((item) => {
    const misses = state.misses[item.id] ?? 0;
    const cleared = state.cleared.includes(item.id);

    return {
      itemId: item.id,
      misses,
      correctFirstTry: cleared && misses === 0,
      revealed: state.revealed.includes(item.id),
    };
  });
}

/**
 * The items of a new round (spec §5.3): never answered right first, then the
 * most missed, then the rest; shuffled inside each group; at most ROUND_SIZE.
 */
export function buildRound(
  items: PackItem[],
  progress: LanguageProgress,
  seed: number,
): PackItem[] {
  const random = mulberry32(seed);
  const neverRight: PackItem[] = [];
  const missed: PackItem[] = [];
  const rest: PackItem[] = [];

  for (const item of items) {
    const stats = progress[item.id];
    if (!stats || stats.correctFirstTry === 0) neverRight.push(item);
    else if (stats.missed > 0) missed.push(item);
    else rest.push(item);
  }

  const missedFirst = shuffle(missed, random).sort(
    (a, b) => progress[b.id].missed - progress[a.id].missed,
  );

  return [
    ...shuffle(neverRight, random),
    ...missedFirst,
    ...shuffle(rest, random),
  ].slice(0, ROUND_SIZE);
}
