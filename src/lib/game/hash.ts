/**
 * FNV-1a, 32-bit. Small, stable, and enough to order things reproducibly.
 *
 * Used wherever the game needs a choice that varies per item but must be the
 * same on every render and every build: distractor candidates, tile order.
 */
export function hash(text: string): number {
  let value = 2166136261;

  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}
