import type { Metadata } from "next";

import { FigureGrid } from "@/components/peoples/figure-grid";
import { Footnotes } from "@/components/peoples/footnotes";
import { PeopleHero } from "@/components/peoples/people-hero";
import { buildFootnotes } from "@/lib/peoples/footnotes";
import { ashaninka } from "@/lib/peoples";

// Static rather than `generateMetadata`: the route has no params, so there is
// nothing to await and nothing to compute per request.
export const metadata: Metadata = {
  title: "Pueblo Asháninka",
  description: ashaninka.summary.text,
};

export default function AshaninkaPage() {
  // Numbering is derived once, here, and passed down: the order the sections
  // appear in below is the order `buildFootnotes` walks.
  const footnotes = buildFootnotes(ashaninka);

  return (
    <main className="flex flex-1 flex-col">
      <PeopleHero people={ashaninka} footnotes={footnotes} />
      <FigureGrid figures={ashaninka.figures} footnotes={footnotes} />
      <Footnotes footnotes={footnotes} updatedAt={ashaninka.updatedAt} />
    </main>
  );
}
