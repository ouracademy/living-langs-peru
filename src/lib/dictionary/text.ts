/**
 * Stand-in for ñ while diacritics are stripped. NFD decomposes ñ into
 * n + U+0303, so a naive strip would turn it into a plain n — wrong for
 * Asháninka, where ñ is a letter in its own right, not an accented n.
 */
const ENYE_TOKEN = "\u0000";

const COMBINING_MARKS = /[\u0300-\u036f]/g;

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "");
}

/**
 * Folds text for searching and comparison: lowercase, no diacritics, but ñ
 * survives as a distinct letter.
 */
export function normalize(text: string): string {
  const protected_ = text.trim().toLowerCase().replaceAll("ñ", ENYE_TOKEN);

  return stripDiacritics(protected_).replaceAll(ENYE_TOKEN, "ñ");
}

/**
 * Builds the URL-safe id for an entry. Unlike `normalize`, ñ folds to n so
 * shared links stay ASCII; `resolveWord` still accepts the raw word, so a
 * hand-typed ?palabra=ñaaka resolves the same as ?palabra=naaka.
 *
 * Idempotent: slugify(slugify(x)) === slugify(x).
 */
export function slugify(word: string): string {
  return stripDiacritics(word.trim().toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

/**
 * Spanish alphabetical order: ñ sorts after n and before o, and accented
 * vowels sort with their base letter.
 *
 * Asháninka may order digraphs (ch, sh, ts, ky) as letters of their own. If
 * that is confirmed, this is the single place to swap in a per-language
 * collation table — callers do not need to change.
 */
export function compareWords(a: string, b: string): number {
  return collator.compare(a, b);
}
