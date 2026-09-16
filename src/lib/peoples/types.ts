/** The only people this page knows about. Not a lookup key: there is no registry. */
export type PeopleSlug = "ashaninka";

/** Id of an entry in `People.sources`. */
export type SourceId = string;

export type Source = {
  id: SourceId;
  title: string;
  publisher: string;
  url: string;
  /** Publication year of the work itself, when it has one. */
  year?: number;
  /** ISO 8601 (YYYY-MM-DD): when we last read it. */
  retrievedAt: string;
  /** As the source declares it. Absent means no licence was declared. */
  license?: string;
  note?: string;
};

export type FigureUnit = "people" | "speakers" | "localities" | "communities";

export type Figure = {
  id: string;
  /** Spanish: people read this. */
  label: string;
  value: number;
  unit: FigureUnit;
  /** Year the datum refers to, not the year we read it. */
  year?: number;
  sourceId: SourceId;
  /** Required wherever the number can be misread. See spec §5.3. */
  note?: string;
};

/**
 * Every run of prose on the page carries its own sources. There is no exempt
 * paragraph: `peoples:check` fails on an empty `sourceIds`.
 */
export type Paragraph = {
  text: string;
  sourceIds: SourceId[];
};

export type PeopleSection = {
  /** URL anchor, in Spanish: "historia", "territorio". */
  id: string;
  title: string;
  paragraphs: Paragraph[];
};

export type TimelineEvent = {
  id: string;
  /** Free text rather than dates: sources give ranges and approximations. */
  period: string;
  title: string;
  text: string;
  sourceIds: SourceId[];
};

export type Territory = {
  regions: string[];
  rivers: string[];
  basins: string[];
  sourceIds: SourceId[];
};

export type PhotoCredit = {
  author: string;
  /** «CC BY-SA 4.0», «Dominio público». Never empty: no credit, no photo. */
  license: string;
  /** Page of the file in its home repository. */
  url: string;
};

export type Photo = {
  src: string;
  width: number;
  height: number;
  /** Spanish, descriptive, never empty. */
  alt: string;
  caption?: string;
  credit: PhotoCredit;
};

export type LanguageProfile = {
  family: string;
  /** ISO 639-3 codes of the varieties. */
  isoCodes: string[];
  /** Graphemes in the normalised alphabet. */
  letters: number;
  sourceIds: SourceId[];
};

export type People = {
  slug: PeopleSlug;
  name: string;
  summary: Paragraph;
  language: LanguageProfile;
  figures: Figure[];
  sections: PeopleSection[];
  timeline: TimelineEvent[];
  territory: Territory;
  photos: Photo[];
  sources: Source[];
  /** ISO 8601: shown to the reader as «Datos actualizados al …». */
  updatedAt: string;
};
