import { Citation } from "@/components/peoples/citation";
import { citationId, citationsFor } from "@/lib/peoples/footnotes";
import type { Footnote } from "@/lib/peoples/footnotes";
import { PERU_DEPARTMENTS, PERU_VIEWBOX } from "@/lib/peoples/peru-departments";
import { highlightedRegionIds } from "@/lib/peoples/territory";
import type { Territory } from "@/lib/peoples";

type TerritoryMapProps = {
  territory: Territory;
  footnotes: Footnote[];
};

const HIGHLIGHT = "#E4572E";
const REST = "#E7DFCD";

/** Spanish list punctuation: «a, b y c». */
function listed(items: string[]): string {
  if (items.length < 2) return items.join("");

  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

/**
 * The map and the same information in words, in one component on purpose.
 *
 * A highlighted map is unreadable for anyone who cannot see it and for anyone
 * who cannot tell those two colours apart, so the list below is not a
 * nice-to-have — it is the accessible form of the data (spec §6.4). Keeping
 * them in one file means nobody removes the list while tidying the map.
 *
 * Which departments light up comes from `territory.regions` through
 * `highlightedRegionIds`, never from a hand-written list of ids.
 */
export function TerritoryMap({ territory, footnotes }: TerritoryMapProps) {
  const highlighted = new Set(highlightedRegionIds(territory));
  const names = PERU_DEPARTMENTS.filter((department) =>
    highlighted.has(department.id),
  ).map((department) => department.name);

  return (
    <div className="mt-10 grid grid-cols-1 items-start gap-10 md:grid-cols-[minmax(0,320px)_1fr]">
      <figure className="m-0">
        <svg
          role="img"
          aria-labelledby="mapa-territorio-title"
          viewBox={`0 0 ${PERU_VIEWBOX.width} ${PERU_VIEWBOX.height}`}
          className="h-auto w-full max-w-[320px]"
        >
          <title id="mapa-territorio-title">
            {`Mapa del Perú con ${names.length} regiones resaltadas: ${listed(names)}.`}
          </title>
          {PERU_DEPARTMENTS.map((department) => (
            <path
              key={department.id}
              id={department.id}
              d={department.d}
              // The shapes carry no information the `<title>` does not
              // already give: the map is one image, not 26 of them.
              aria-hidden="true"
              fill={highlighted.has(department.id) ? HIGHLIGHT : REST}
              stroke="#FFF7E8"
              strokeWidth={1.5}
            />
          ))}
        </svg>
        <figcaption className="mt-3 text-sm text-[#4A4130]">
          Departamentos del Perú; en color, donde vive el pueblo asháninka.
          <Citation
            anchor={citationId("territorio")}
            numbers={citationsFor(footnotes, territory.sourceIds)}
          />
        </figcaption>
      </figure>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold tracking-wide text-[#C7431C] uppercase">
            Regiones
          </h3>
          <ul className="mt-3 flex flex-col gap-1 text-lg text-[#241D14]">
            {names.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-wide text-[#C7431C] uppercase">
            Ríos principales
          </h3>
          <ul className="mt-3 flex flex-col gap-1 text-lg text-[#241D14]">
            {territory.rivers.map((river) => (
              <li key={river}>{river}</li>
            ))}
          </ul>
        </div>
        <div className="sm:col-span-2">
          <h3 className="text-sm font-bold tracking-wide text-[#C7431C] uppercase">
            Cuencas
          </h3>
          <p className="mt-3 text-lg text-[#241D14]">
            {listed(territory.basins)}.
          </p>
        </div>
      </div>
    </div>
  );
}
