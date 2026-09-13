import type { Entry } from "../dictionary/types.ts";
import { normalize } from "../dictionary/text.ts";

import { MIN_SENTENCE_TOKENS } from "./constants.ts";
import { hash } from "./hash.ts";
import type { Item } from "./types.ts";

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

/**
 * Two real words from other entries, or null if there aren't two to be had.
 *
 * The gloss filter is the rule that cannot be relaxed: a distractor meaning
 * the same as the answer makes the item unsolvable. The preferences below can
 * give way, in order, rather than losing the item — a plausible distractor is
 * better than none, and none means one fewer sentence to learn from.
 *
 * What this cannot do is judge whether a distractor is grammatically
 * impossible in the gap. That needs a parser of Asháninka we do not have, or a
 * speaker; it is why the plan has a human review of the generated pool. See
 * specs §5.4.
 */
function pickDistractors(
  itemId: string,
  target: Entry,
  entries: Entry[],
): [string, string] | null {
  const answerGlosses = new Set(target.translations.map(normalize));
  const answer = normalize(target.word);
  const answerTokens = tokenize(target.word).length;

  const eligible = entries.filter(
    (candidate) =>
      candidate.id !== target.id &&
      normalize(candidate.word) !== answer &&
      // Never relaxed.
      !candidate.translations.some((gloss) =>
        answerGlosses.has(normalize(gloss)),
      ),
  );

  // Ordered by a hash of the pair, so the choice is stable per item without
  // being the same two words for every item.
  const byHash = (a: Entry, b: Entry) =>
    hash(`${itemId}:${a.id}`) - hash(`${itemId}:${b.id}`) ||
    a.id.localeCompare(b.id);

  const sameClass = (candidate: Entry) =>
    candidate.partOfSpeech === target.partOfSpeech;
  const sameLength = (candidate: Entry) =>
    tokenize(candidate.word).length === answerTokens;

  // Strictest first; each fallback drops one preference, never the filter.
  const tiers = [
    eligible.filter((c) => sameClass(c) && sameLength(c)),
    eligible.filter(sameClass),
    eligible.filter(sameLength),
    eligible,
  ];

  for (const tier of tiers) {
    if (tier.length >= 2) {
      const [first, second] = [...tier].sort(byHash);

      return [first.word, second.word];
    }
  }

  return null;
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
