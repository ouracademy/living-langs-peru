import { hash } from "./hash";
import type { Item } from "./types";

/**
 * The three tiles for an item, in the order they are shown.
 *
 * Derived from the item id and the lesson seed rather than shuffled in the
 * component: the same lesson has to look the same on a re-render, and the
 * answer must not sit in the same slot every time, or a learner could score a
 * whole lesson without reading a word.
 */
export function orderOptions(item: Item, seed: number): string[] {
  const options = [...item.distractors];
  const at = hash(`${seed}:${item.id}`) % (options.length + 1);

  options.splice(at, 0, item.answer);

  return options;
}
