import { normalize } from "./text.ts";

/**
 * The official Asháninka alphabet: 19 letters, 4 vowels and 15 consonants,
 * approved by Resolución Directoral 0606-2008-ED and Resolución Ministerial
 * 303-2015-MINEDU.
 *
 * ch, sh, ts and ty are letters in their own right, not sequences, so they
 * both sort and group as single units. Note there is no c, d, f, g, l, q, u,
 * v, w, x or z.
 */
export const ASHANINKA_ALPHABET = [
  "a",
  "b",
  "ch",
  "e",
  "i",
  "j",
  "k",
  "m",
  "n",
  "ñ",
  "o",
  "p",
  "r",
  "s",
  "sh",
  "t",
  "ts",
  "ty",
  "y",
] as const;

const ALPHABETS: Record<string, readonly string[]> = {
  ashaninka: ASHANINKA_ALPHABET,
};

/** Letters outside the alphabet sort after every official letter. */
const UNKNOWN_RANK = ASHANINKA_ALPHABET.length + 1;

/**
 * Splits a word into alphabet letters, matching the longest first so "ts"
 * never comes back as "t" followed by "s".
 */
export function tokenizeWord(word: string, language?: string): string[] {
  const alphabet = language ? ALPHABETS[language] : undefined;
  const text = normalize(word);

  if (!alphabet) return [...text];

  // Longest first, so digraphs win over their initial letter.
  const byLength = [...alphabet].sort((a, b) => b.length - a.length);
  const letters: string[] = [];
  let at = 0;

  while (at < text.length) {
    const match = byLength.find((letter) => text.startsWith(letter, at));

    letters.push(match ?? text[at]);
    at += match?.length ?? 1;
  }

  return letters;
}

const spanish = new Intl.Collator("es", { sensitivity: "base" });

function rank(letter: string, alphabet: readonly string[]): number {
  const index = alphabet.indexOf(letter);

  return index === -1 ? UNKNOWN_RANK : index;
}

/**
 * Returns the comparator for a language's own alphabet, falling back to
 * Spanish collation for languages with no table of their own.
 */
export function getComparator(
  language?: string,
): (a: string, b: string) => number {
  const alphabet = language ? ALPHABETS[language] : undefined;

  if (!alphabet) {
    return (a, b) => spanish.compare(a, b);
  }

  return (a, b) => {
    const left = tokenizeWord(a, language);
    const right = tokenizeWord(b, language);

    for (let at = 0; at < Math.min(left.length, right.length); at += 1) {
      const difference =
        rank(left[at], alphabet) - rank(right[at], alphabet) ||
        // Two letters outside the alphabet still need a stable order.
        left[at].localeCompare(right[at]);

      if (difference !== 0) return difference;
    }

    return left.length - right.length;
  };
}

/**
 * The section a word belongs to in the A-Z index: a digraph stays whole, so
 * "chakopibenki" lands under "Ch" and not under "C". Returns null when the
 * word does not start with a letter.
 */
export function getInitial(word: string, language?: string): string | null {
  const [first] = tokenizeWord(word, language);

  if (!first || !/^\p{Letter}+$/u.test(first)) return null;

  return first.charAt(0).toUpperCase() + first.slice(1);
}
