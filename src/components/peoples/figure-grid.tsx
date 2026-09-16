import { formatFigure } from "@/lib/peoples/format";
import type { Figure } from "@/lib/peoples";

type FigureGridProps = {
  figures: Figure[];
};

/**
 * The 2017 census yields three different counts of the Asháninka people, and
 * the page shows all three with their own label and note. Collapsing them into
 * a single "population" number would be factually wrong. See spec §5.3.
 */
export function FigureGrid({ figures }: FigureGridProps) {
  return (
    <section
      id="poblacion"
      aria-labelledby="poblacion-title"
      className="scroll-mt-24 bg-white"
    >
      <div className="mx-auto max-w-[1180px] px-8 py-16">
        <h2 id="poblacion-title" className="text-3xl font-bold text-[#241D14]">
          Población
        </h2>
        <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {figures.map((figure) => (
            <div key={figure.id} className="rounded-[28px] bg-[#FBEFD2] p-7">
              <dt className="text-sm font-bold text-[#4A4130]">
                {figure.label}
                {figure.year ? ` (${figure.year})` : null}
              </dt>
              <dd className="mt-2 text-4xl font-bold text-[#C7431C]">
                {formatFigure(figure)}
              </dd>
              {figure.note ? (
                <p className="mt-3 text-sm text-[#4A4130]">{figure.note}</p>
              ) : null}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
