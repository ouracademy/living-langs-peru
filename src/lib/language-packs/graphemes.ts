import type { LanguagePack } from "./types.ts";

/** What the letter modes need to know about a language. */
export type LetterRules = Pick<
  LanguagePack["language"],
  "graphemes" | "vowels" | "vowelVariants"
>;

/** The form a grapheme is compared in: NFC and lower case. */
export function normalizeGrapheme(text: string): string {
  return text.normalize("NFC").toLocaleLowerCase("es");
}

/**
 * Splits a word into the graphemes of the language, longest match first (`ts`
 * before `t`, spec §4.2). Anything not in the list is a token of one character.
 * Matching ignores case; the tokens keep the word's own spelling, so a masked
 * word reads as it was written.
 */
export function tokenizeGraphemes(word: string, graphemes: string[]): string[] {
  const text = word.normalize("NFC");
  const lower = normalizeGrapheme(text);
  // Lower-casing can change the length of a few letters (İ). Then the tokens
  // come from the lower-cased text rather than from misaligned slices.
  const source = lower.length === text.length ? text : lower;
  const candidates = [
    ...new Set(graphemes.map(normalizeGrapheme).filter((g) => g !== "")),
  ].sort((a, b) => b.length - a.length);

  const tokens: string[] = [];
  let index = 0;

  while (index < lower.length) {
    const match = candidates.find((candidate) =>
      lower.startsWith(candidate, index),
    );
    const size = match
      ? match.length
      : (lower.codePointAt(index) ?? 0) > 0xffff
        ? 2
        : 1;
    tokens.push(source.slice(index, index + size));
    index += size;
  }

  return tokens;
}

/** The first grapheme of the word, normalised, or null if the language lacks it. */
export function initialGrapheme(
  word: string,
  graphemes: string[],
): string | null {
  const [first] = tokenizeGraphemes(word, graphemes);
  if (first === undefined) return null;

  const initial = normalizeGrapheme(first);
  return graphemes.map(normalizeGrapheme).includes(initial) ? initial : null;
}

export type VowelSlot = {
  /** Position in `tokens`. */
  index: number;
  /** The vowel it stands for, after `vowelVariants` («á» → «a»). */
  vowel: string;
};

/**
 * The places where a vowel of the language appears. Variants fold onto their
 * vowel, so «á» counts as «a» (AC-SP2-5).
 */
export function vowelSlots(
  word: string,
  rules: LetterRules,
): { tokens: string[]; slots: VowelSlot[] } {
  const variants = new Map(
    Object.entries(rules.vowelVariants ?? {}).map(([variant, vowel]) => [
      normalizeGrapheme(variant),
      normalizeGrapheme(vowel),
    ]),
  );
  const vowels = new Set(rules.vowels.map(normalizeGrapheme));
  const tokens = tokenizeGraphemes(word, [
    ...rules.vowels,
    ...variants.keys(),
    ...rules.graphemes,
  ]);

  const slots = tokens.flatMap((token, index) => {
    const lower = normalizeGrapheme(token);
    const vowel = variants.get(lower) ?? lower;
    return vowels.has(vowel) ? [{ index, vowel }] : [];
  });

  return { tokens, slots };
}
