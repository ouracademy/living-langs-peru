import type { Metadata } from "next";

import { FigureGrid } from "@/components/peoples/figure-grid";
import { Footnotes } from "@/components/peoples/footnotes";
import { PeopleHero } from "@/components/peoples/people-hero";
import { PeopleSection } from "@/components/peoples/people-section";
import { PhotoGallery } from "@/components/peoples/photo-gallery";
import { TerritoryMap } from "@/components/peoples/territory-map";
import { Timeline } from "@/components/peoples/timeline";
import { buildFootnotes } from "@/lib/peoples/footnotes";
import { ashaninka } from "@/lib/peoples";

// Static rather than `generateMetadata`: the route has no params, so there is
// nothing to await and nothing to compute per request.
export const metadata: Metadata = {
  title: "Pueblo Asháninka",
  description: ashaninka.summary.text,
};

/** Anchor of the section the map is rendered inside. */
const TERRITORY_SECTION = "territorio";

export default function AshaninkaPage() {
  // Numbering is derived once, here, and passed down: the order the sections
  // appear in below is the order `buildFootnotes` walks.
  const footnotes = buildFootnotes(ashaninka);

  return (
    <main className="flex flex-1 flex-col">
      <PeopleHero people={ashaninka} footnotes={footnotes} />
      <FigureGrid figures={ashaninka.figures} footnotes={footnotes} />
      {ashaninka.sections.map((section, index) => (
        <PeopleSection
          key={section.id}
          section={section}
          footnotes={footnotes}
          // Bands alternate down the page so two sections never run together.
          tone={index % 2 === 0 ? "cream" : "white"}
        >
          {/* The map belongs to the territory section, and is cited there. */}
          {section.id === TERRITORY_SECTION ? (
            <TerritoryMap
              territory={ashaninka.territory}
              footnotes={footnotes}
            />
          ) : null}
        </PeopleSection>
      ))}
      <Timeline events={ashaninka.timeline} footnotes={footnotes} />
      <PhotoGallery photos={ashaninka.photos} />
      <Footnotes footnotes={footnotes} updatedAt={ashaninka.updatedAt} />
    </main>
  );
}
