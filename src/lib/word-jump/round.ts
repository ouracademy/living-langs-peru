import { mulberry32, shuffle } from "../game/random.ts";
import type { PackItem, Theme } from "../language-packs/types.ts";
import { ROUND_SIZE } from "./constants.ts";
import type { QuestionRules } from "./questions.ts";
import type { LanguageProgress } from "./stats.ts";

/**
 * What a round needs to ask its questions. The round itself is played by the
 * platform level (platformer/game.ts); the reducer that played it as a list of
 * buttons was retired with gestor-lenguas F4. No clock, no randomness and no
 * storage in here: the seed comes in as an argument.
 */
export type RoundContext = {
  theme: Theme;
  /** The output of `playableThemes`: where distractors may come from. */
  playable: Theme[];
  /** Graphemes and vowels of the language, for the letter modes. */
  rules?: QuestionRules;
};

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
