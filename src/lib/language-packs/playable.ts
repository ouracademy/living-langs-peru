import { normalizeWord } from "./clean.ts";
import type { GameMode, LanguagePack, PackItem, Theme } from "./types.ts";

/** Smallest number of usable items a mode needs to make a question (spec §4.3). */
const MINIMUM_ITEMS: Partial<Record<GameMode, number>> = {
  pic2word: 3,
};

/**
 * Items a mode can ask about. Only pic2word is playable in F1a; the other modes
 * return nothing until they are built (tasks/saltapalabras T1.15, T3.3).
 */
function usableForMode(mode: GameMode, items: PackItem[]): PackItem[] {
  switch (mode) {
    case "pic2word":
      return items.filter((item) => (item.emoji ?? "") !== "");
    default:
      return [];
  }
}

function distinctWords(items: PackItem[]): number {
  return new Set(items.map((item) => normalizeWord(item.word))).size;
}

/**
 * The only door between a pack and the person playing (spec §4.2): keeps, in
 * each theme, the items that are verified, cite a source that exists, and have
 * a word and a translation; then drops the themes that fall below the minimum
 * of their mode. Nothing unverified gets past this function (decision #4).
 */
export function playableThemes(pack: LanguagePack): Theme[] {
  const sourceIds = new Set(pack.sources.map((source) => source.id));

  return pack.themes.flatMap((theme) => {
    const checked = theme.items.filter(
      (item) =>
        item.verified &&
        item.sourceId !== undefined &&
        sourceIds.has(item.sourceId) &&
        item.word.trim() !== "" &&
        item.translation.trim() !== "",
    );
    const usable = usableForMode(theme.mode, checked);
    const minimum = MINIMUM_ITEMS[theme.mode];

    if (minimum === undefined || distinctWords(usable) < minimum) {
      return [];
    }

    return [{ ...theme, items: usable }];
  });
}
