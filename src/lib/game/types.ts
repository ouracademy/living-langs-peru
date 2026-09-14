/**
 * One exercise: a sourced sentence with exactly one word blanked out.
 *
 * Everything here comes from an entry of the dictionary and its cited example.
 * Nothing is generated, translated or completed by us — see specs §5.3.
 */
export type Item = {
  /** `${entryId}:${exampleIndex}`. Stable across builds, so saved progress keeps meaning. */
  id: string;
  /**
   * The sentence split into words, with the blank as `null`. Punctuation rides
   * along with the word that carries it, except around the blank, where it
   * becomes its own token so the sentence still reads as the source wrote it.
   */
  tokens: (string | null)[];
  /**
   * The word that fills the blank, in the dictionary's canonical spelling.
   *
   * Deliberately not the surface form from the sentence: in 13 of the 148
   * items the headword opens the sentence, and a capitalised answer next to
   * two lowercase distractors gives the answer away. The feedback panel shows
   * the original sentence verbatim, so nothing about the source is lost.
   */
  answer: string;
  /** Two real words from other entries. Their order is decided at lesson time. */
  distractors: [string, string];
  /** The Spanish translation of the whole sentence — the prompt. */
  prompt: string;
  /** Spanish gloss of `answer`, shown in the feedback, never in the prompt. */
  answerTranslation: string;
  /** Points at `sources.json`, so every item can be attributed. */
  sourceId: string;
};
