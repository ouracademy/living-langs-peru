/**
 * Turning an item's tokens back into a readable sentence.
 *
 * Pure and tested rather than inlined in the view, because "the sentence has
 * to read exactly as the source wrote it" is a correctness rule about cited
 * content, not a styling detail.
 */

/** Read out for the gap. A long dash is not announced by a screen reader. */
export const BLANK_LABEL = "espacio en blanco";

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const OPENING_PUNCTUATION = /^[¿¡("'«[{]+$/u;

function isPunctuationOnly(token: string): boolean {
  return !LETTER_OR_DIGIT.test(token);
}

export type SentencePart = {
  /** The word, or `null` for the gap. */
  token: string | null;
  /** Whether a space goes in front of it. */
  spaceBefore: boolean;
};

export function toSentenceParts(tokens: (string | null)[]): SentencePart[] {
  return tokens.map((token, index) => {
    const previous = index > 0 ? tokens[index - 1] : null;
    const closesOnto = token !== null && isPunctuationOnly(token) && index > 0;
    const opensInto =
      index > 0 && previous !== null && OPENING_PUNCTUATION.test(previous);

    return {
      token,
      spaceBefore: index > 0 && !closesOnto && !opensInto,
    };
  });
}
