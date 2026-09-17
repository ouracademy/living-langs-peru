import type { Figure, FigureUnit } from "./types";

/**
 * U+00A0. A plain space would let the browser break «118 277» across two
 * lines, where it reads as two different numbers.
 */
const NON_BREAKING_SPACE = " ";

/** Spanish nouns for each unit, singular first. */
const UNIT_NAMES: Record<FigureUnit, readonly [string, string]> = {
  people: ["persona", "personas"],
  speakers: ["hablante", "hablantes"],
  localities: ["localidad", "localidades"],
  communities: ["comunidad", "comunidades"],
};

/**
 * Groups thousands explicitly rather than through `Intl.NumberFormat`, for two
 * reasons: no Spanish locale produces the hard space the design calls for
 * (es-PE gives «118,277», which reads as a decimal), and the separator a locale
 * picks depends on the ICU build, so the same code would render differently on
 * a developer's machine and in CI.
 */
export function formatCount(value: number): string {
  const digits = String(Math.trunc(Math.abs(value)));
  const groups: string[] = [];

  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  }

  const grouped = groups.join(NON_BREAKING_SPACE);

  return value < 0 ? `−${grouped}` : grouped;
}

/** «118 277 personas». Singular for one, so a count never reads «1 personas». */
export function formatFigure(figure: Figure): string {
  const [singular, plural] = UNIT_NAMES[figure.unit];
  const noun = Math.abs(figure.value) === 1 ? singular : plural;

  return `${formatCount(figure.value)} ${noun}`;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/**
 * «2026-09-11» → «11 de septiembre de 2026».
 *
 * Reads the parts rather than going through `new Date`, which parses a bare
 * ISO date as UTC midnight: in any negative offset that renders as the day
 * before, silently contradicting the date the source is stamped with.
 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);

  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}
