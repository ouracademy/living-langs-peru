import { MIN_POOL_SIZE } from "./constants.ts";
import { toSentenceText } from "./sentence.ts";
import type { Item } from "./types.ts";

/**
 * Checks a generated pool. Pure, so it is testable; the script around it only
 * reads files and prints.
 *
 * This guards against the failure nobody would notice: a change to the
 * dictionary that stops the headword matching its example, which silently
 * shrinks the pool instead of breaking anything.
 */
export function validatePool(items: Item[], language: string): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const where = `«${item.id}»`;

    if (seen.has(item.id)) problems.push(`${where}: id repetido`);
    seen.add(item.id);

    const gaps = item.tokens.filter((token) => token === null).length;

    if (gaps !== 1)
      problems.push(`${where}: tiene ${gaps} huecos, debe tener 1`);

    if (item.answer.trim() === "") problems.push(`${where}: respuesta vacía`);
    if (item.prompt.trim() === "") problems.push(`${where}: enunciado vacío`);

    // Attribution is not optional: an uncitable sentence does not ship.
    if (!item.sourceId) problems.push(`${where}: sin sourceId`);

    if (item.distractors.length !== 2) {
      problems.push(
        `${where}: ${item.distractors.length} distractores, deben ser 2`,
      );
    }

    if (item.distractors.includes(item.answer)) {
      problems.push(`${where}: un distractor es la respuesta`);
    }

    if (new Set(item.distractors).size !== item.distractors.length) {
      problems.push(`${where}: distractores repetidos`);
    }
  }

  if (items.length < MIN_POOL_SIZE) {
    problems.push(
      `${language}: solo ${items.length} ítems, el mínimo es ${MIN_POOL_SIZE}. ` +
        "Suele significar que una palabra dejó de coincidir con su oración.",
    );
  }

  return problems;
}

/** Human-readable dump of the pool, for the review a speaker has to do. */
export function describePool(items: Item[]): string {
  return items
    .map(
      (item, index) =>
        `${index + 1}. [${item.id}] ${item.sourceId}\n` +
        `   es: «${item.prompt}»\n` +
        `   cni: ${toSentenceText(item.tokens, `«${item.answer}»`)}\n` +
        `   glosa: ${item.answerTranslation}\n` +
        `   distractores: ${item.distractors.join(" · ")}`,
    )
    .join("\n\n");
}
