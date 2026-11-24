import { normalizeWord } from "./clean.ts";
import {
  type LetterRules,
  initialGrapheme,
  normalizeGrapheme,
  vowelSlots,
} from "./graphemes.ts";
import type { GameMode, LanguagePack, PackItem, Theme } from "./types.ts";

/** Smallest number of distinct options a question needs (spec §4.3). */
const MINIMUM_CHOICES = 3;

function distinct(values: string[]): number {
  return new Set(values).size;
}

/** Items a mode can ask about (spec §4.3, «Mínimo para jugar»). */
function usableForMode(
  mode: GameMode,
  items: PackItem[],
  rules: LetterRules,
): PackItem[] {
  switch (mode) {
    case "pic2word":
    case "word2pic":
      return items.filter((item) => (item.emoji ?? "") !== "");
    case "first":
      return items.filter(
        (item) => initialGrapheme(item.word, rules.graphemes) !== null,
      );
    case "vowel":
      return items.filter(
        (item) => vowelSlots(item.word, rules).slots.length > 0,
      );
    case "listen":
      // Built with audio in F3 (tasks/saltapalabras T3.3). Until then a listen
      // theme is never played, whatever audio it carries (AC-SP1-6).
      return [];
  }
}

/** Whether a mode can make questions out of these usable items. */
function meetsMinimum(
  mode: GameMode,
  usable: PackItem[],
  rules: LetterRules,
): boolean {
  switch (mode) {
    case "pic2word":
      return (
        distinct(usable.map((item) => normalizeWord(item.word))) >=
        MINIMUM_CHOICES
      );
    case "word2pic":
      return (
        distinct(usable.map((item) => item.emoji ?? "")) >= MINIMUM_CHOICES
      );
    case "first":
      return (
        usable.length > 0 &&
        distinct(rules.graphemes.map(normalizeGrapheme)) >= MINIMUM_CHOICES
      );
    case "vowel":
      // Two vowels at least: one vowel alone is not a choice.
      return (
        usable.length > 0 && distinct(rules.vowels.map(normalizeGrapheme)) >= 2
      );
    case "listen":
      return false;
  }
}

function hasText(item: PackItem): boolean {
  return item.word.trim() !== "" && item.translation.trim() !== "";
}

/** Keeps the items `keep` accepts, then the themes that still reach their minimum. */
function themesWith(
  pack: LanguagePack,
  keep: (item: PackItem) => boolean,
): Theme[] {
  return pack.themes.flatMap((theme) => {
    const kept = theme.items.filter((item) => hasText(item) && keep(item));
    const usable = usableForMode(theme.mode, kept, pack.language);

    if (!meetsMinimum(theme.mode, usable, pack.language)) {
      return [];
    }

    return [{ ...theme, items: usable }];
  });
}

/**
 * The only door between a pack and the person playing (spec §4.2): keeps, in
 * each theme, the items that are verified, cite a source that exists, and have
 * a word and a translation; then drops the themes that fall below the minimum
 * of their mode. Nothing unverified gets past this function (decision #4).
 */
export function playableThemes(pack: LanguagePack): Theme[] {
  const sourceIds = new Set(pack.sources.map((source) => source.id));

  return themesWith(
    pack,
    (item) =>
      item.verified &&
      item.sourceId !== undefined &&
      sourceIds.has(item.sourceId),
  );
}

/**
 * «Probar» in /admin/lenguas (spec §9.1, AC-SP6-10): the same themes, but with
 * the unverified and unsourced items too, so they can be reviewed before
 * publishing. Only the admin page uses it; the public page never does.
 */
export function previewThemes(pack: LanguagePack): Theme[] {
  return themesWith(pack, () => true);
}
