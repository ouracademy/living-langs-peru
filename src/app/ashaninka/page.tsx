import type { Metadata } from "next";

import { FigureGrid } from "@/components/peoples/figure-grid";
import { PeopleHero } from "@/components/peoples/people-hero";
import { ashaninka } from "@/lib/peoples";

// Static rather than `generateMetadata`: the route has no params, so there is
// nothing to await and nothing to compute per request.
export const metadata: Metadata = {
  title: "Pueblo Asháninka",
  description: ashaninka.summary.text,
};

export default function AshaninkaPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PeopleHero people={ashaninka} />
      <FigureGrid figures={ashaninka.figures} />
    </main>
  );
}
