import { citationsInRenderOrder } from "./footnotes.ts";
import { unknownRegions } from "./territory.ts";
import { containsTerm } from "./terms.ts";
import type { Paragraph, People, Photo, SourceId } from "./types.ts";

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

/**
 * Alt values that name the medium instead of describing it. Matched against
 * the whole normalised value, never as a substring: a real alt may open with
 * «Fotografía antigua de …» and must survive.
 */
const GENERIC_ALTS = new Set([
  "foto",
  "fotografia",
  "imagen",
  "ilustracion",
  "dibujo",
  "image",
  "photo",
  "picture",
]);

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\s]/gu, "")
    .trim()
    .toLowerCase();
}

function photoProblems(photo: Photo, index: number): string[] {
  const where = `photos[${index}] (${photo.src})`;
  const problems: string[] = [];

  if (!photo.alt?.trim()) {
    problems.push(`${where}: alt vacío. Una imagen sin alt no es publicable.`);
  } else if (GENERIC_ALTS.has(normalise(photo.alt))) {
    problems.push(
      `${where}: alt genérico («${photo.alt.trim()}»). Describe la imagen para quien no la ve.`,
    );
  }

  for (const side of ["width", "height"] as const) {
    if (!Number.isFinite(photo[side]) || photo[side] <= 0) {
      problems.push(
        `${where}: falta ${side}. Sin las dimensiones reales la galería salta al cargar.`,
      );
    }
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

/** Every run of prose on the page, with where it lives for the error message. */
function paragraphsOf(
  people: People,
): { where: string; paragraph: Paragraph }[] {
  return [
    { where: "summary", paragraph: people.summary },
    ...people.sections.flatMap((section) =>
      section.paragraphs.map((paragraph, index) => ({
        where: `sections.${section.id}.paragraphs[${index}]`,
        paragraph,
      })),
    ),
  ];
}

/**
 * A term is a promise about the text. It has to be in the paragraph that
 * declares it, and once a word is marked anywhere it has to be marked
 * everywhere — otherwise the same word is styled as Asháninka in one place
 * and as Spanish in the next, and nothing says which one is right.
 */
function termProblems(people: People): string[] {
  const paragraphs = paragraphsOf(people);
  const known = new Map<string, string>();

  for (const { paragraph } of paragraphs) {
    for (const term of paragraph.terms ?? []) {
      known.set(term.normalize("NFC").toLowerCase(), term);
    }
  }

  const problems: string[] = [];

  for (const { where, paragraph } of paragraphs) {
    const own = new Set(
      (paragraph.terms ?? []).map((term) =>
        term.normalize("NFC").toLowerCase(),
      ),
    );

    for (const term of paragraph.terms ?? []) {
      if (!containsTerm(paragraph.text, term)) {
        problems.push(
          `${where}: el término «${term}» está en terms pero no aparece en el texto.`,
        );
      }
    }

    for (const [key, term] of known) {
      if (!own.has(key) && containsTerm(paragraph.text, term)) {
        problems.push(
          `${where}: «${term}» aparece sin marcar. Añádelo a terms para que se muestre con lang="cni".`,
        );
      }
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

  for (const region of unknownRegions(people.territory)) {
    problems.push(
      `territory.regions: «${region}» no corresponde a ningún departamento del mapa. ` +
        `Sin un id que dibujar, la región desaparecería del SVG en silencio.`,
    );
  }

  problems.push(...termProblems(people));

  people.photos.forEach((photo, index) => {
    problems.push(...photoProblems(photo, index));
  });

  return problems;
}
