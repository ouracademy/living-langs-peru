import type { People, Source, SourceId } from "./types";

export type Footnote = {
  /** 1-based, in order of first appearance on the page. */
  number: number;
  source: Source;
};

/**
 * Every source id the page cites, in the order the page renders them. Keep
 * this in step with the order of sections in the route: the numbering a
 * reader sees is derived from it, never written by hand.
 *
 * Photos are absent on purpose — their attribution is rendered next to the
 * image, not as a footnote.
 */
function citedInRenderOrder(people: People): SourceId[] {
  return [
    ...people.summary.sourceIds,
    ...people.figures.map((figure) => figure.sourceId),
    ...people.sections.flatMap((section) =>
      section.paragraphs.flatMap((paragraph) => paragraph.sourceIds),
    ),
    ...people.timeline.flatMap((event) => event.sourceIds),
    ...people.territory.sourceIds,
    ...people.language.sourceIds,
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

  for (const id of citedInRenderOrder(people)) {
    if (numbered.has(id)) continue;

    const source = byId.get(id);

    // An id with no source is a data error, reported by `peoples:check`.
    // Rendering skips it rather than printing a citation that leads nowhere.
    if (!source) continue;

    numbered.add(id);
    footnotes.push({ number: footnotes.length + 1, source });
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
