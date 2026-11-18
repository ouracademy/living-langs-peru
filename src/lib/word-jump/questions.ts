import { shuffle } from "../game/random.ts";
import { normalizeWord } from "../language-packs/clean.ts";
import type { PackItem, Theme } from "../language-packs/types.ts";
import { OPTIONS_PER_QUESTION } from "./constants.ts";

export type QuestionOption = {
  itemId: string;
  text: string;
};

export type Question = {
  mode: "pic2word";
  itemId: string;
  /** What is asked: the emoji, whose accessible name is the translation (spec §7.3). */
  prompt: { emoji: string; label: string };
  options: QuestionOption[];
  answerIndex: number;
};

/**
 * A distractor must not look like a second right answer: not the same word,
 * and not the same meaning (AC-SP2-2).
 */
function canDistract(answer: PackItem, candidate: PackItem): boolean {
  return (
    candidate.id !== answer.id &&
    normalizeWord(candidate.word) !== normalizeWord(answer.word) &&
    normalizeWord(candidate.translation) !== normalizeWord(answer.translation)
  );
}

function pickDistractors(
  answer: PackItem,
  candidates: PackItem[],
  count: number,
  random: () => number,
): PackItem[] {
  const picked: PackItem[] = [];
  const words = new Set([normalizeWord(answer.word)]);

  for (const candidate of shuffle(candidates, random)) {
    if (picked.length === count) break;
    const word = normalizeWord(candidate.word);
    if (!canDistract(answer, candidate) || words.has(word)) continue;
    words.add(word);
    picked.push(candidate);
  }

  return picked;
}

/**
 * One question for `item`, seeded (spec §5.2). `playable` is the output of
 * `playableThemes`: distractors come only from there, never invented and never
 * unverified (AC-SP2-3). Same theme first; another theme only if it is short.
 */
export function buildQuestion(
  item: PackItem,
  theme: Theme,
  playable: Theme[],
  random: () => number,
): Question {
  const needed = OPTIONS_PER_QUESTION - 1;
  const fromTheme = pickDistractors(item, theme.items, needed, random);
  const others = playable
    .filter((other) => other.id !== theme.id)
    .flatMap((other) => other.items);
  const distractors =
    fromTheme.length < needed
      ? [
          ...fromTheme,
          ...pickDistractors(
            item,
            others.filter((other) =>
              fromTheme.every(
                (taken) =>
                  normalizeWord(taken.word) !== normalizeWord(other.word),
              ),
            ),
            needed - fromTheme.length,
            random,
          ),
        ]
      : fromTheme;

  const options = shuffle(
    [item, ...distractors].map((option) => ({
      itemId: option.id,
      text: option.word,
    })),
    random,
  );

  return {
    mode: "pic2word",
    itemId: item.id,
    prompt: { emoji: item.emoji ?? "", label: item.translation },
    options,
    answerIndex: options.findIndex((option) => option.itemId === item.id),
  };
}
