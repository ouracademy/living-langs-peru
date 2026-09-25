import type { People, Source, SourceId } from "./types";

export type Footnote = {
  /** 1-based, in order of first appearance on the page. */
  number: number;
  source: Source;
  /** Anchor of the first citation, so the note can link back to the text. */
  backTo: string;
};

/**
 * Anchor for one citation mark. Both the walk below and the components that
 * render the marks build their ids through this function, so the note's
 * back-link and the element it points at cannot drift apart.
 */
export function citationId(...parts: (string | number)[]): string {
  return ["cita", ...parts].join("-");
}

/** One place on the page that cites something. */
export type Citation = {
  anchor: string;
  sourceIds: SourceId[];
};

/**
 * Every source id the page cites, in the order the page renders them. Keep
 * this in step with the order of sections in the route: the numbering a
 * reader sees is derived from it, never written by hand.
 *
 * Photos are absent on purpose — their attribution is rendered next to the
 * image, not as a footnote.
 */
export function citationsInRenderOrder(people: People): Citation[] {
  return [
    // The hero, in the order it renders: the summary, then the language card.
    { anchor: citationId("resumen"), sourceIds: people.summary.sourceIds },
    { anchor: citationId("lengua"), sourceIds: people.language.sourceIds },
    ...people.figures.map((figure) => ({
      anchor: citationId("cifra", figure.id),
      sourceIds: [figure.sourceId],
    })),
    ...people.sections.flatMap((section) =>
      section.paragraphs.map((paragraph, index) => ({
        anchor: citationId("parrafo", section.id, index),
        sourceIds: paragraph.sourceIds,
      })),
    ),
    // The map's own attribution. It renders inside the territory section, so
    // it is cited with the sections and before the timeline.
    { anchor: citationId("territorio"), sourceIds: people.territory.sourceIds },
    ...people.timeline.map((event) => ({
      anchor: citationId("suceso", event.id),
      sourceIds: event.sourceIds,
    })),
  ];
}

/**
 * Numbers each cited source once, the first time it appears. A source cited
 * five times gets one number; a source declared and never cited gets none and
 * is not listed, so the reader never sees a footnote nothing points at.
 */
export function buildFootnotes(people: People): Footnote[] {
  const byId = new Map(people.sources.map((source) => [source.id, source]));
  const numbered = new Set<SourceId>();
  const footnotes: Footnote[] = [];

  for (const citation of citationsInRenderOrder(people)) {
    for (const id of citation.sourceIds) {
      if (numbered.has(id)) continue;

      const source = byId.get(id);

      // An id with no source is a data error, reported by `peoples:check`.
      // Rendering skips it rather than printing a citation that leads nowhere.
      if (!source) continue;

      numbered.add(id);
      footnotes.push({
        number: footnotes.length + 1,
        source,
        backTo: citation.anchor,
      });
    }
  }

  return footnotes;
}

/** The footnote numbers for one citation, ascending and without repeats. */
export function citationsFor(
  footnotes: Footnote[],
  sourceIds: SourceId[],
): number[] {
  const numberById = new Map(
    footnotes.map((footnote) => [footnote.source.id, footnote.number]),
  );
  const numbers = new Set<number>();

  for (const id of sourceIds) {
    const number = numberById.get(id);

    if (number !== undefined) numbers.add(number);
  }

  return [...numbers].sort((first, second) => first - second);
}
