import Link from "next/link";

import type { Source } from "@/lib/peoples";

type RelatedLinksProps = {
  /** The dictionary of the people's language: the natural next stop. */
  dictionaryHref: string;
  /** Sources a reader can go and read, not the map's cartography credit. */
  sources: Source[];
};

/**
 * Where to go from here: the dictionary inside the site, and the sources
 * outside it. The full numbered list of what each claim rests on is the
 * footnotes; this is the shorter path for someone who wants to keep reading.
 */
export function RelatedLinks({ dictionaryHref, sources }: RelatedLinksProps) {
  return (
    <section
      id="enlaces"
      aria-labelledby="enlaces-title"
      className="scroll-mt-24 bg-white"
    >
      <div className="mx-auto max-w-[1180px] px-8 py-16">
        <h2 id="enlaces-title" className="text-3xl font-bold text-[#241D14]">
          Para seguir explorando
        </h2>
        <div className="mt-8 grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <Link
            href={dictionaryHref}
            className="block rounded-[28px] bg-[#FBEFD2] p-7 transition-colors hover:bg-[#F6E4B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
          >
            <span className="block text-2xl font-bold text-[#C7431C]">
              Diccionario asháninka
            </span>
            <span className="mt-2 block text-lg text-[#4A4130]">
              Busca palabras de la lengua y mira cómo se usan en oraciones.
            </span>
          </Link>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-[#C7431C] uppercase">
              Fuentes en línea
            </h3>
            <ul className="mt-3 flex flex-col gap-3 text-lg text-[#4A4130]">
              {sources.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#C7431C] underline underline-offset-2 hover:no-underline"
                  >
                    {source.title}
                  </a>
                  {" — "}
                  {source.publisher}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
