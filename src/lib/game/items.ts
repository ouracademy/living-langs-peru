import type { Entry } from "@/lib/dictionary";
import { normalize } from "@/lib/dictionary/text";

import { MIN_SENTENCE_TOKENS } from "./constants";
import type { Item } from "./types";

/**
 * Turns dictionary entries into game items. Pure and deterministic: the same
 * entries always produce the same items, in the same order, with the same
 * distractors — otherwise an item id would mean something different next week
 * and saved progress would drift.
 */

const LEADING_PUNCTUATION = /^[^\p{L}\p{N}]+/u;
const TRAILING_PUNCTUATION = /[^\p{L}\p{N}]+$/u;

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Comparison key for a token: folded for case and diacritics, stripped of the
 * punctuation that rides along with it. `normalize` keeps ñ distinct from n,
 * which in Asháninka is a different letter and not an accent.
 */
function tokenKey(token: string): string {
  return normalize(
    token.replace(LEADING_PUNCTUATION, "").replace(TRAILING_PUNCTUATION, ""),
  );
}

function keysOf(form: string): string[] {
  return tokenize(form).map(tokenKey).filter(Boolean);
}

/**
 * Where `needle` occurs as a contiguous run of tokens, or -1.
 *
 * A run and not a single token: seven headwords are two words
 * (`apiapitachari ñantsi`), and matching token by token would never find them.
 */
function findSequence(keys: string[], needle: string[]): number {
  for (let at = 0; at + needle.length <= keys.length; at++) {
    if (needle.every((key, offset) => keys[at + offset] === key)) return at;
  }

  return -1;
}

/**
 * Replaces the matched run with a single gap, keeping the punctuation that sat
 * against it as tokens of its own. Without that, `kaniri?` would take the
 * question mark into the blank and the sentence would come back wrong.
 */
function blank(
  tokens: string[],
  at: number,
  length: number,
): (string | null)[] {
  const span = tokens.slice(at, at + length);
  const leading = LEADING_PUNCTUATION.exec(span[0])?.[0];
  const trailing = TRAILING_PUNCTUATION.exec(span[span.length - 1])?.[0];

  return [
    ...tokens.slice(0, at),
    ...(leading ? [leading] : []),
    null,
    ...(trailing ? [trailing] : []),
    ...tokens.slice(at + length),
  ];
}

/** FNV-1a. Small, stable, and enough to order candidates reproducibly. */
function hash(text: string): number {
  let value = 2166136261;

  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

/**
 * Two real words from other entries, or null if there aren't two to be had.
 *
 * The gloss filter is the rule that cannot be relaxed: a distractor meaning
 * the same as the answer makes the item unsolvable. What this cannot do is
 * judge whether a distractor is grammatically impossible in the gap — that
 * needs a parser of Asháninka we do not have, or a speaker. See specs §5.4.
 */
function pickDistractors(
  itemId: string,
  target: Entry,
  entries: Entry[],
): [string, string] | null {
  const answerGlosses = new Set(target.translations.map(normalize));
  const answer = normalize(target.word);

  const candidates = entries
    .filter(
      (candidate) =>
        candidate.id !== target.id &&
        normalize(candidate.word) !== answer &&
        !candidate.translations.some((gloss) =>
          answerGlosses.has(normalize(gloss)),
        ),
    )
    // Ordered by a hash of the pair, so the choice is stable per item but not
    // the same two words for every item.
    .sort(
      (a, b) =>
        hash(`${itemId}:${a.id}`) - hash(`${itemId}:${b.id}`) ||
        a.id.localeCompare(b.id),
    );

  if (candidates.length < 2) return null;

  return [candidates[0].word, candidates[1].word];
}

export function buildItems(entries: Entry[]): Item[] {
  const items: Item[] = [];

  for (const entry of entries) {
    const forms = [entry.word, ...(entry.variants ?? [])]
      .map(keysOf)
      .filter((form) => form.length > 0);

    entry.examples.forEach((example, index) => {
      const tokens = tokenize(example.sentence);

      if (tokens.length < MIN_SENTENCE_TOKENS) return;

      const keys = tokens.map(tokenKey);
      const match = forms
        .map((form) => ({ at: findSequence(keys, form), length: form.length }))
        .find((found) => found.at !== -1);

      // The headword agglutinated inside another word is not the headword.
      // Forcing a match would blank something the entry does not name.
      if (!match) return;

      // No attribution, no item: showing a sentence we cannot cite would
      // break the promise the dictionary already makes.
      const sourceId = example.sourceId ?? entry.sourceId;

      if (!sourceId) return;

      const id = `${entry.id}:${index}`;
      const distractors = pickDistractors(id, entry, entries);

      if (!distractors) return;

      items.push({
        id,
        tokens: blank(tokens, match.at, match.length),
        answer: entry.word,
        distractors,
        prompt: example.translation,
        answerTranslation: entry.translations.join(", "),
        sourceId,
      });
    });
  }

  return items;
}
