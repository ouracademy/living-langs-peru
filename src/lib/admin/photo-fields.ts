import { isGenericAlt } from "@/lib/peoples/validate";

/**
 * The text fields of a gallery photo and their limits (spec §6.3). Pure and
 * free of Node APIs: the form runs it before sending and the server runs it
 * again, so both show the same message for the same mistake.
 */

export const MAX_GALLERY_PHOTOS = 24;

const LIMITS = {
  altMin: 10,
  altMax: 300,
  caption: 200,
  author: 120,
  license: 120,
} as const;

export type PhotoFields = {
  alt: string;
  caption: string;
  author: string;
  license: string;
  url: string;
};

export type PhotoFieldName = keyof PhotoFields;

/** Spanish message per field with a problem; an empty object means valid. */
export type PhotoFieldProblems = Partial<Record<PhotoFieldName, string>>;

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function trimFields(fields: PhotoFields): PhotoFields {
  return {
    alt: fields.alt.trim(),
    caption: fields.caption.trim(),
    author: fields.author.trim(),
    license: fields.license.trim(),
    url: fields.url.trim(),
  };
}

export function photoFieldProblems(input: PhotoFields): PhotoFieldProblems {
  const fields = trimFields(input);
  const problems: PhotoFieldProblems = {};

  if (!fields.alt) {
    problems.alt = "Escribe una descripción de la foto.";
  } else if (isGenericAlt(fields.alt)) {
    problems.alt =
      "La descripción es demasiado genérica. Cuenta qué se ve en la foto.";
  } else if (fields.alt.length < LIMITS.altMin) {
    problems.alt = `La descripción necesita al menos ${LIMITS.altMin} caracteres.`;
  } else if (fields.alt.length > LIMITS.altMax) {
    problems.alt = `La descripción puede tener hasta ${LIMITS.altMax} caracteres.`;
  }

  if (fields.caption.length > LIMITS.caption) {
    problems.caption = `El pie de foto puede tener hasta ${LIMITS.caption} caracteres.`;
  }

  if (!fields.author) {
    problems.author = "Escribe quién tomó la foto.";
  } else if (fields.author.length > LIMITS.author) {
    problems.author = `El autor puede tener hasta ${LIMITS.author} caracteres.`;
  }

  if (!fields.license) {
    problems.license = "Escribe la licencia de la foto.";
  } else if (fields.license.length > LIMITS.license) {
    problems.license = `La licencia puede tener hasta ${LIMITS.license} caracteres.`;
  }

  if (!fields.url) {
    problems.url = "Escribe la dirección de donde sale la foto.";
  } else if (!isHttpsUrl(fields.url)) {
    problems.url = "La dirección tiene que empezar con https://";
  }

  return problems;
}
