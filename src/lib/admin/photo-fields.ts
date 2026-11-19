import type { PhotoCredit } from "@/lib/peoples";
import { isGenericAlt, isHttpsUrl } from "@/lib/peoples/validate";

/**
 * The text fields of a gallery photo and their limits (spec §6.3). Pure and
 * free of Node APIs: the form runs it before sending and the server runs it
 * again, so both show the same message for the same mistake.
 *
 * Since 2026-11-18 only the photo and its description are required. Author and
 * license come prefilled with the team's credit and fall back to it when left
 * empty; the source URL is optional.
 */

export const MAX_GALLERY_PHOTOS = 24;

/** What the form prefills, and what an empty author or license becomes. */
export const DEFAULT_CREDIT = {
  author: "Living Langs Peru",
  license: "Foto del equipo",
} as const;

export const FIELD_LIMITS = {
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

export const EMPTY_PHOTO_FIELDS: PhotoFields = {
  alt: "",
  caption: "",
  author: DEFAULT_CREDIT.author,
  license: DEFAULT_CREDIT.license,
  url: "",
};

export function trimFields(fields: PhotoFields): PhotoFields {
  return {
    alt: fields.alt.trim(),
    caption: fields.caption.trim(),
    author: fields.author.trim(),
    license: fields.license.trim(),
    url: fields.url.trim(),
  };
}

/** Trimmed, with the team's credit where author or license was left empty. */
export function withCreditDefaults(fields: PhotoFields): PhotoFields {
  const trimmed = trimFields(fields);
  return {
    ...trimmed,
    author: trimmed.author || DEFAULT_CREDIT.author,
    license: trimmed.license || DEFAULT_CREDIT.license,
  };
}

/** The credit as it is written to the JSON: no `url` key when there is none. */
export function creditFrom(fields: PhotoFields): PhotoCredit {
  const filled = withCreditDefaults(fields);
  return {
    author: filled.author,
    license: filled.license,
    ...(filled.url ? { url: filled.url } : {}),
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
  } else if (fields.alt.length < FIELD_LIMITS.altMin) {
    problems.alt = `La descripción necesita al menos ${FIELD_LIMITS.altMin} caracteres.`;
  } else if (fields.alt.length > FIELD_LIMITS.altMax) {
    problems.alt = `La descripción puede tener hasta ${FIELD_LIMITS.altMax} caracteres.`;
  }

  if (fields.caption.length > FIELD_LIMITS.caption) {
    problems.caption = `El pie de foto puede tener hasta ${FIELD_LIMITS.caption} caracteres.`;
  }

  if (fields.author.length > FIELD_LIMITS.author) {
    problems.author = `El autor puede tener hasta ${FIELD_LIMITS.author} caracteres.`;
  }

  if (fields.license.length > FIELD_LIMITS.license) {
    problems.license = `La licencia puede tener hasta ${FIELD_LIMITS.license} caracteres.`;
  }

  if (fields.url && !isHttpsUrl(fields.url)) {
    problems.url = "La dirección tiene que empezar con https://";
  }

  return problems;
}
