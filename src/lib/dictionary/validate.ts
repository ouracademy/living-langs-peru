import { languages } from "../languages.ts";

import { PLACEHOLDER_SOURCE_ID } from "./constants.ts";
import { slugify } from "./text.ts";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Checks one dictionary data file and returns every problem found, so a single
 * run reports all of them rather than stopping at the first.
 *
 * Deliberately hand-rolled rather than pulling in a schema library: the shape
 * is small, and adding a dependency needs a decision.
 */
export function validateDictionary(data: unknown): string[] {
  const problems: string[] = [];

  if (!isRecord(data)) {
    return ["El archivo no contiene un objeto."];
  }

  const knownSlugs = languages.map((language) => language.slug as string);

  if (!isNonEmptyString(data.language) || !knownSlugs.includes(data.language)) {
    problems.push(
      `La lengua «${String(data.language)}» no está en src/lib/languages.ts.`,
    );
  }

  if (!Array.isArray(data.entries)) {
    problems.push("«entries» debe ser una lista.");
    return problems;
  }

  const seen = new Set<string>();

  for (const [index, raw] of data.entries.entries()) {
    const at = `entrada ${index}`;

    if (!isRecord(raw)) {
      problems.push(`${at}: no es un objeto.`);
      continue;
    }

    const word = isNonEmptyString(raw.word) ? raw.word : undefined;
    const label = word ?? at;

    if (!word) problems.push(`${at}: falta «word».`);

    if (!isNonEmptyString(raw.id)) {
      problems.push(`${label}: falta «id».`);
    } else {
      if (seen.has(raw.id))
        problems.push(`${label}: id duplicado «${raw.id}».`);
      seen.add(raw.id);

      if (word && raw.id !== slugify(word)) {
        problems.push(
          `${label}: el id «${raw.id}» no es slugify(word) «${slugify(word)}».`,
        );
      }
    }

    if (
      !Array.isArray(raw.translations) ||
      !raw.translations.some(isNonEmptyString)
    ) {
      problems.push(`${label}: necesita al menos una traducción.`);
    }

    if (!Array.isArray(raw.examples)) {
      problems.push(`${label}: «examples» debe ser una lista.`);
    } else {
      for (const [exampleIndex, example] of raw.examples.entries()) {
        if (
          !isRecord(example) ||
          !isNonEmptyString(example.sentence) ||
          !isNonEmptyString(example.translation)
        ) {
          problems.push(
            `${label}: el ejemplo ${exampleIndex} necesita «sentence» y «translation».`,
          );
        }
      }
    }

    // Scaffolding must never reach production.
    if (raw.sourceId === PLACEHOLDER_SOURCE_ID) {
      problems.push(
        `${label}: sigue marcada como «${PLACEHOLDER_SOURCE_ID}». Reemplaza el contenido por datos con fuente citada.`,
      );
    }
  }

  return problems;
}
