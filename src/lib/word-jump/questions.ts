import { shuffle } from "../game/random.ts";
import { normalizeWord } from "../language-packs/clean.ts";
import {
  type LetterRules,
  normalizeGrapheme,
  tokenizeGraphemes,
  vowelSlots,
} from "../language-packs/graphemes.ts";
import type { LanguagePack, PackItem, Theme } from "../language-packs/types.ts";
import { OPTIONS_PER_QUESTION } from "./constants.ts";

/** The modes that can be played without audio (listen arrives in F3). */
export type QuestionMode = "pic2word" | "word2pic" | "first" | "vowel";

/** What the letter modes need from the pack's language. */
export type QuestionRules = LetterRules &
  Pick<LanguagePack["language"], "confusable">;

const NO_RULES: QuestionRules = { graphemes: [], vowels: [] };

/** Where the hidden part of a word goes. Full width, so it reads as a gap. */
export const GAP = "＿";

/** At most this many vowels are offered in the vowel mode (spec §4.3). */
const MAX_VOWEL_OPTIONS = 4;

export type QuestionOption = {
  /** Shown on the button: a word, an emoji or a grapheme. */
  text: string;
  /** The item behind the option, for the word and picture modes. */
  itemId?: string;
  /** Accessible name when `text` is an emoji: the translation (spec §7.3). */
  label?: string;
};

export type Question = {
  mode: QuestionMode;
  itemId: string;
  /**
   * What is asked. `emoji` is named by `label`, the translation; `text` is in
   * the language, maybe with a gap.
   */
  prompt: { emoji?: string; label?: string; text?: string };
  options: QuestionOption[];
  answerIndex: number;
  /** Whether the options are written in the language (`lang` on the buttons). */
  optionsInLanguage: boolean;
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

/**
 * Up to `count` distractors from `candidates`, never two with the same `key`
 * nor one with the answer's `key` (the word, or the picture).
 */
function pickDistractors(
  answer: PackItem,
  candidates: PackItem[],
  count: number,
  key: (item: PackItem) => string,
  taken: Set<string>,
  random: () => number,
): PackItem[] {
  const picked: PackItem[] = [];

  for (const candidate of shuffle(candidates, random)) {
    if (picked.length === count) break;
    const value = key(candidate);
    if (!canDistract(answer, candidate) || taken.has(value)) continue;
    taken.add(value);
    picked.push(candidate);
  }

  return picked;
}

/**
 * Distractor items for the word and picture modes (spec §5.2): playable items
 * of the same theme first, of another playable theme only if it is short.
 * Never invented and never unverified (AC-SP2-3).
 */
function itemDistractors(
  item: PackItem,
  theme: Theme,
  playable: Theme[],
  key: (item: PackItem) => string,
  random: () => number,
): PackItem[] {
  const needed = OPTIONS_PER_QUESTION - 1;
  const taken = new Set([key(item)]);
  const fromTheme = pickDistractors(
    item,
    theme.items,
    needed,
    key,
    taken,
    random,
  );
  if (fromTheme.length === needed) return fromTheme;

  const others = playable
    .filter((other) => other.id !== theme.id)
    .flatMap((other) => other.items)
    .filter((other) => key(other) !== "");

  return [
    ...fromTheme,
    ...pickDistractors(
      item,
      others,
      needed - fromTheme.length,
      key,
      taken,
      random,
    ),
  ];
}

function finish(
  mode: QuestionMode,
  item: PackItem,
  prompt: Question["prompt"],
  answer: QuestionOption,
  distractors: QuestionOption[],
  optionsInLanguage: boolean,
  random: () => number,
): Question {
  const options = shuffle([answer, ...distractors], random);

  return {
    mode,
    itemId: item.id,
    prompt,
    options,
    answerIndex: options.indexOf(answer),
    optionsInLanguage,
  };
}

/** pic2word: the picture is shown, the word is chosen. */
function pictureToWord(
  item: PackItem,
  theme: Theme,
  playable: Theme[],
  random: () => number,
): Question {
  const wordOf = (option: PackItem) => normalizeWord(option.word);
  const distractors = itemDistractors(item, theme, playable, wordOf, random);

  return finish(
    "pic2word",
    item,
    { emoji: item.emoji ?? "", label: item.translation },
    { itemId: item.id, text: item.word },
    distractors.map((option) => ({ itemId: option.id, text: option.word })),
    true,
    random,
  );
}

/** word2pic: the word is shown, the picture is chosen. */
function wordToPicture(
  item: PackItem,
  theme: Theme,
  playable: Theme[],
  random: () => number,
): Question {
  const pictureOf = (option: PackItem) => option.emoji ?? "";
  const distractors = itemDistractors(item, theme, playable, pictureOf, random);
  const asOption = (option: PackItem): QuestionOption => ({
    itemId: option.id,
    text: option.emoji ?? "",
    label: option.translation,
  });

  return finish(
    "word2pic",
    item,
    { text: item.word },
    asOption(item),
    distractors.map(asOption),
    false,
    random,
  );
}

/** The picture and its name, when the item has one; the meaning otherwise. */
function hint(item: PackItem): Pick<Question["prompt"], "emoji" | "label"> {
  return item.emoji
    ? { emoji: item.emoji, label: item.translation }
    : { label: item.translation };
}

/**
 * first: the word without its first grapheme, and three graphemes to choose
 * from. Distractors are the item's confusable graphemes first, then others of
 * the language, always different from the answer (spec §5.2, AC-SP2-4).
 */
function firstLetter(
  item: PackItem,
  rules: QuestionRules,
  random: () => number,
): Question {
  const tokens = tokenizeGraphemes(item.word, rules.graphemes);
  const answer = normalizeGrapheme(tokens[0] ?? "");
  const needed = OPTIONS_PER_QUESTION - 1;
  const taken = new Set([answer]);
  const distractors: string[] = [];

  const confusable = (rules.confusable?.[answer] ?? []).map(normalizeGrapheme);
  const others = rules.graphemes.map(normalizeGrapheme);

  for (const candidate of [
    ...shuffle(confusable, random),
    ...shuffle(others, random),
  ]) {
    if (distractors.length === needed) break;
    if (candidate === "" || taken.has(candidate)) continue;
    taken.add(candidate);
    distractors.push(candidate);
  }

  return finish(
    "first",
    item,
    { ...hint(item), text: GAP + tokens.slice(1).join("") },
    { text: answer },
    distractors.map((text) => ({ text })),
    true,
    random,
  );
}

/**
 * vowel: one vowel of the word is hidden, chosen by the PRNG, and the vowels of
 * the language are offered, at most four. A repeated vowel is hidden once
 * (spec §5.2). Variants fold onto their vowel (AC-SP2-5).
 */
function missingVowel(
  item: PackItem,
  rules: QuestionRules,
  random: () => number,
): Question {
  const { tokens, slots } = vowelSlots(item.word, rules);
  const slot = slots[Math.floor(random() * slots.length)];
  const vowels = [...new Set(rules.vowels.map(normalizeGrapheme))];
  const others = shuffle(
    vowels.filter((vowel) => vowel !== slot.vowel),
    random,
  ).slice(0, MAX_VOWEL_OPTIONS - 1);
  const text = tokens
    .map((token, index) => (index === slot.index ? GAP : token))
    .join("");

  return finish(
    "vowel",
    item,
    { ...hint(item), text },
    { text: slot.vowel },
    others.map((vowel) => ({ text: vowel })),
    true,
    random,
  );
}

/**
 * One question for `item`, seeded (spec §5.2). `playable` is the output of
 * `playableThemes`: word and picture distractors come only from there. The
 * letter modes take their graphemes and vowels from `rules`, the pack's
 * language. `theme.mode` picks the kind of question.
 */
export function buildQuestion(
  item: PackItem,
  theme: Theme,
  playable: Theme[],
  random: () => number,
  rules: QuestionRules = NO_RULES,
): Question {
  switch (theme.mode) {
    case "word2pic":
      return wordToPicture(item, theme, playable, random);
    case "first":
      return firstLetter(item, rules, random);
    case "vowel":
      return missingVowel(item, rules, random);
    case "pic2word":
    case "listen":
      // listen is never playable before F3 (playableThemes drops it).
      return pictureToWord(item, theme, playable, random);
  }
}
