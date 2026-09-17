import { formatDate } from "@/lib/peoples/format";
import type { Footnote } from "@/lib/peoples/footnotes";

type FootnotesProps = {
  footnotes: Footnote[];
  /** ISO date of the last content review. */
  updatedAt: string;
};

/**
 * The list every citation mark points at. Each note carries the date we read
 * the source, and the page states when the content was last reviewed: this is
 * what tells a reader how old the data is, in place of a live fetch.
 */
export function Footnotes({ footnotes, updatedAt }: FootnotesProps) {
  return (
    <section
      id="fuentes"
      aria-labelledby="fuentes-title"
      className="scroll-mt-24 bg-[#FFF7E8]"
    >
      <div className="mx-auto max-w-[1180px] px-8 py-16">
        <h2 id="fuentes-title" className="text-3xl font-bold text-[#241D14]">
          Fuentes
        </h2>
        <ol className="mt-8 flex flex-col gap-5">
          {footnotes.map((footnote) => (
            <li
              key={footnote.number}
              id={`nota-${footnote.number}`}
              className="scroll-mt-24 text-[#4A4130]"
            >
              <span className="font-bold text-[#241D14]">
                {footnote.number}.
              </span>{" "}
              <a
                href={footnote.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#C7431C] underline underline-offset-2 hover:no-underline"
              >
                {footnote.source.title}
              </a>
              . {footnote.source.publisher}. Consultado el{" "}
              {formatDate(footnote.source.retrievedAt)}.
              {footnote.source.note ? ` ${footnote.source.note}` : null}{" "}
              <a
                href={`#${footnote.backTo}`}
                className="whitespace-nowrap text-[#C7431C] underline underline-offset-2 hover:no-underline"
              >
                ↩ Volver al texto
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-[#4A4130]">
          Datos actualizados al {formatDate(updatedAt)}.
        </p>
      </div>
    </section>
  );
}
