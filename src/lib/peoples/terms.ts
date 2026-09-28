/** A run of text, either plain or one of the Asháninka terms inside it. */
export type TextSegment = { text: string; term: boolean };

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

/**
 * One pattern for every term. A term counts only as a whole word: `ene` is a
 * river and must not light up inside «tenemos». The longest terms go first so
 * `pinkathari` wins over a shorter term that happens to be its prefix.
 */
function matcher(terms: string[]): RegExp | null {
  const usable = [...new Set(terms.map((term) => term.normalize("NFC").trim()))]
    .filter((term) => term !== "")
    .sort((first, second) => second.length - first.length);

  if (usable.length === 0) return null;

  const alternatives = usable.map((term) => term.replace(ESCAPE, "\\$&"));

  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
}

/**
 * Splits a paragraph into plain text and Asháninka terms, so the renderer can
 * wrap only the terms in `<i lang="cni">`. Which words are terms comes from
 * the data (`Paragraph.terms`), never from guessing in the prose.
 *
 * Matching ignores case and unicode normalisation, but every segment keeps
 * the casing of the original text.
 */
export function splitTerms(text: string, terms: string[] = []): TextSegment[] {
  const source = text.normalize("NFC");
  const pattern = matcher(terms);

  if (!pattern) return source === "" ? [] : [{ text: source, term: false }];

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? cursor;

    if (start > cursor) {
      segments.push({ text: source.slice(cursor, start), term: false });
    }

    segments.push({ text: match[0], term: true });
    cursor = start + match[0].length;
  }

  if (cursor < source.length) {
    segments.push({ text: source.slice(cursor), term: false });
  }

  return segments;
}

/** True when `term` appears in `text` as a whole word. */
export function containsTerm(text: string, term: string): boolean {
  return splitTerms(text, [term]).some((segment) => segment.term);
}
