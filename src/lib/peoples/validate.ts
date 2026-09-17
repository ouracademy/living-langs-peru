import { citationsInRenderOrder } from "./footnotes.ts";
import type { People, Photo, SourceId } from "./types.ts";

/**
 * The three 2017 census counts measure different things — people living in
 * Asháninka localities, people who self-identify, and people whose first
 * language is Asháninka. Each must carry a note saying which, or the page
 * invites the reader to read them as one number. See spec §5.3.
 */
const FIGURES_NEEDING_A_NOTE = [
  "population-localities",
  "self-identified",
  "childhood-speakers",
];

/** True for a real calendar date written as YYYY-MM-DD. */
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return false;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    else seen.add(id);
  }

  return [...repeated];
}

function photoProblems(photo: Photo, index: number): string[] {
  const where = `photos[${index}] (${photo.src})`;
  const problems: string[] = [];

  if (!photo.alt?.trim()) {
    problems.push(`${where}: alt vacío. Una imagen sin alt no es publicable.`);
  }

  for (const field of ["author", "license", "url"] as const) {
    if (!photo.credit?.[field]?.trim()) {
      problems.push(
        `${where}: falta credit.${field} (autor · licencia · URL).`,
      );
    }
  }

  return problems;
}

/**
 * Every rule the content must satisfy, checked all at once: the caller gets
 * the whole list of problems rather than only the first one.
 */
export function validatePeople(people: People): string[] {
  const problems: string[] = [];
  const declared = new Set<SourceId>(people.sources.map((source) => source.id));
  const cited = new Set<SourceId>();

  for (const citation of citationsInRenderOrder(people)) {
    for (const id of citation.sourceIds) {
      cited.add(id);

      if (!declared.has(id)) {
        problems.push(
          `${citation.anchor}: cita la fuente «${id}», que no está en sources.`,
        );
      }
    }
  }

  if (people.summary.sourceIds.length === 0) {
    problems.push("summary: párrafo sin fuente.");
  }

  for (const section of people.sections) {
    section.paragraphs.forEach((paragraph, index) => {
      if (paragraph.sourceIds.length === 0) {
        problems.push(
          `sections.${section.id}.paragraphs[${index}]: párrafo sin fuente.`,
        );
      }
    });
  }

  for (const source of people.sources) {
    if (!isCalendarDate(source.retrievedAt)) {
      problems.push(
        `sources.${source.id}: retrievedAt «${source.retrievedAt}» no es una fecha YYYY-MM-DD.`,
      );
    }

    if (!cited.has(source.id)) {
      problems.push(
        `sources.${source.id}: fuente declarada que no cita nadie («${source.id}»).`,
      );
    }
  }

  for (const id of duplicates(people.figures.map((figure) => figure.id))) {
    problems.push(`figures: id duplicado «${id}».`);
  }

  for (const id of duplicates(people.sections.map((section) => section.id))) {
    problems.push(`sections: id duplicado «${id}».`);
  }

  for (const id of FIGURES_NEEDING_A_NOTE) {
    const figure = people.figures.find((candidate) => candidate.id === id);

    if (figure && !figure.note?.trim()) {
      problems.push(
        `figures.${id}: falta la note que explica qué mide esta cifra del censo.`,
      );
    }
  }

  people.photos.forEach((photo, index) => {
    problems.push(...photoProblems(photo, index));
  });

  return problems;
}
