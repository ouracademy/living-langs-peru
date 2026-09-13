/** Items per lesson. A short lesson is the point; see specs §6.1. */
export const LESSON_SIZE = 10;

/** Mistakes allowed before the lesson ends. Also what bounds the requeue loop. */
export const HEARTS = 3;

/**
 * Tiles per item: the answer plus two distractors.
 *
 * Three and not four because the words are long — up to 22 characters — and
 * four tiles do not fit legibly on a phone without shrinking them.
 */
export const OPTIONS_PER_ITEM = 3;

/**
 * Shortest sentence that can become an item. Blanking one of two words leaves
 * a single word as the only cue, which is trivial rather than instructive.
 */
export const MIN_SENTENCE_TOKENS = 3;
