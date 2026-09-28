import type { Metadata } from "next";

import { FigureGrid } from "@/components/peoples/figure-grid";
import { Footnotes } from "@/components/peoples/footnotes";
import { PeopleHero } from "@/components/peoples/people-hero";
import { PeopleSection } from "@/components/peoples/people-section";
import { PhotoGallery } from "@/components/peoples/photo-gallery";
import { RelatedLinks } from "@/components/peoples/related-links";
import { TerritoryMap } from "@/components/peoples/territory-map";
import { Timeline } from "@/components/peoples/timeline";
import { buildFootnotes } from "@/lib/peoples/footnotes";
import { TERRITORY_SECTION_ID } from "@/lib/peoples/territory";
import { ashaninka } from "@/lib/peoples";

// Static rather than `generateMetadata`: the route has no params, so there is
// nothing to await and nothing to compute per request.
export const metadata: Metadata = {
  title: "Pueblo Asháninka",
  description: ashaninka.summary.text,
};

/** The dictionary of the people's language, one click from the page. */
const DICTIONARY_HREF = "/diccionario/ashaninka";

export default function AshaninkaPage() {
  // Numbering is derived once, here, and passed down: the order the sections
  // appear in below is the order `buildFootnotes` walks.
  const footnotes = buildFootnotes(ashaninka);

  // What a reader can go and read: the sources behind the summary, the language
  // card and the figures. The map's cartography is credit, not further reading.
  const readingIds = new Set([
    ...ashaninka.summary.sourceIds,
    ...ashaninka.language.sourceIds,
    ...ashaninka.figures.map((figure) => figure.sourceId),
  ]);
  const readingSources = ashaninka.sources.filter((source) =>
    readingIds.has(source.id),
  );

  return (
    <main className="flex flex-1 flex-col">
      <PeopleHero people={ashaninka} footnotes={footnotes} />
      <FigureGrid figures={ashaninka.figures} footnotes={footnotes} />
      {ashaninka.sections.map((section, index) => (
        <PeopleSection
          key={section.id}
          section={section}
          footnotes={footnotes}
          // Bands alternate down the page so two sections never run together. The
          // blocks after the sections (timeline, gallery, links, notes) pick up
          // the alternation by hand: reorder them and revisit their background.
          tone={index % 2 === 0 ? "cream" : "white"}
        >
          {/* The map belongs to the territory section, and is cited there. */}
          {section.id === TERRITORY_SECTION_ID ? (
            <TerritoryMap
              territory={ashaninka.territory}
              footnotes={footnotes}
            />
          ) : null}
        </PeopleSection>
      ))}
      <Timeline events={ashaninka.timeline} footnotes={footnotes} />
      <PhotoGallery photos={ashaninka.photos} />
      <RelatedLinks dictionaryHref={DICTIONARY_HREF} sources={readingSources} />
      <Footnotes footnotes={footnotes} updatedAt={ashaninka.updatedAt} />
    </main>
  );
}
