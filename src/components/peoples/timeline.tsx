import { Citation } from "@/components/peoples/citation";
import { citationId, citationsFor } from "@/lib/peoples/footnotes";
import type { Footnote } from "@/lib/peoples/footnotes";
import type { TimelineEvent } from "@/lib/peoples";

type TimelineProps = {
  events: TimelineEvent[];
  footnotes: Footnote[];
};

/**
 * The events in order, each with the period it covers. `period` is free text
 * because the sources give ranges and approximations («Hace más de 3 000
 * años»), so it is shown verbatim rather than formatted as a date.
 *
 * Rendered after the prose sections to match the walk in
 * `citationsInRenderOrder`: the footnote numbers a reader sees follow the
 * order of the page, and that order is declared in one place.
 */
export function Timeline({ events, footnotes }: TimelineProps) {
  return (
    <section
      id="linea-de-tiempo"
      aria-labelledby="linea-de-tiempo-title"
      className="scroll-mt-24 bg-white"
    >
      <div className="mx-auto max-w-[1180px] px-8 py-16">
        <h2
          id="linea-de-tiempo-title"
          className="text-3xl font-bold text-[#241D14]"
        >
          Línea de tiempo
        </h2>
        <ol className="mt-10 flex flex-col gap-10 border-l-2 border-[#F0D9A8] pl-8">
          {events.map((event) => (
            <li key={event.id} className="relative max-w-[70ch]">
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-[41px] h-4 w-4 rounded-full border-2 border-white bg-[#C7431C]"
              />
              <p className="text-sm font-bold tracking-wide text-[#C7431C] uppercase">
                {event.period}
              </p>
              <h3 className="mt-1 text-xl font-bold text-[#241D14]">
                {event.title}
              </h3>
              <p className="mt-2 text-lg leading-relaxed text-[#4A4130]">
                {event.text}
                <Citation
                  anchor={citationId("suceso", event.id)}
                  numbers={citationsFor(footnotes, event.sourceIds)}
                />
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
