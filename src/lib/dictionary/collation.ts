import { normalize } from "./text.ts";

/**
 * The alphabet to sort by: a language bundle's own list of graphemes, in its
 * order (spec gestor-lenguas #10). No alphabet is written in code: an empty or
 * missing list falls back to Spanish collation.
 */
export type AlphabetRef = readonly string[];

function resolveAlphabet(ref?: AlphabetRef): readonly string[] | undefined {
  return ref && ref.length > 0 ? ref : undefined;
}

/**
 * Splits a word into alphabet letters, matching the longest first so "ts"
 * never comes back as "t" followed by "s".
 */
export function tokenizeWord(word: string, language?: AlphabetRef): string[] {
  const alphabet = resolveAlphabet(language);
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

/** Letters outside the alphabet sort after every letter of it. */
function rank(letter: string, alphabet: readonly string[]): number {
  const index = alphabet.indexOf(letter);

  return index === -1 ? alphabet.length + 1 : index;
}

/**
 * Returns the comparator for an alphabet, falling back to Spanish collation
 * when there is none.
 */
export function getComparator(
  language?: AlphabetRef,
): (a: string, b: string) => number {
  const alphabet = resolveAlphabet(language);

  if (!alphabet) {
    return (a, b) => spanish.compare(a, b);
  }

  return (a, b) => {
    const left = tokenizeWord(a, alphabet);
    const right = tokenizeWord(b, alphabet);

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
export function getInitial(
  word: string,
  language?: AlphabetRef,
): string | null {
  const [first] = tokenizeWord(word, language);

  if (!first || !/^\p{Letter}+$/u.test(first)) return null;

  return first.charAt(0).toUpperCase() + first.slice(1);
}
