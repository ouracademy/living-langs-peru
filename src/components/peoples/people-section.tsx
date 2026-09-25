import { Citation } from "@/components/peoples/citation";
import { citationId, citationsFor } from "@/lib/peoples/footnotes";
import type { Footnote } from "@/lib/peoples/footnotes";
import type { PeopleSection as Section } from "@/lib/peoples";

type PeopleSectionProps = {
  section: Section;
  footnotes: Footnote[];
  /** Which band of the page this section sits in. */
  tone: "cream" | "white";
  /** Rendered after the prose — the territory map, for instance. */
  children?: React.ReactNode;
};

const BACKGROUND = { cream: "bg-[#FFF7E8]", white: "bg-white" } as const;

/**
 * One run of prose about the people. The section id doubles as its URL anchor,
 * so it is in Spanish («historia») and must stay stable once published.
 */
export function PeopleSection({
  section,
  footnotes,
  tone,
  children,
}: PeopleSectionProps) {
  const titleId = `${section.id}-title`;

  return (
    <section
      id={section.id}
      aria-labelledby={titleId}
      className={`scroll-mt-24 ${BACKGROUND[tone]}`}
    >
      <div className="mx-auto max-w-[1180px] px-8 py-16">
        <h2 id={titleId} className="text-3xl font-bold text-[#241D14]">
          {section.title}
        </h2>
        <div className="mt-8 flex max-w-[70ch] flex-col gap-5">
          {section.paragraphs.map((paragraph, index) => (
            <p
              // Paragraphs have no id of their own: their position *is* their
              // identity, and it is what `citationId` anchors them by.
              key={citationId("parrafo", section.id, index)}
              className="text-lg leading-relaxed text-[#4A4130]"
            >
              {paragraph.text}
              <Citation
                anchor={citationId("parrafo", section.id, index)}
                numbers={citationsFor(footnotes, paragraph.sourceIds)}
              />
            </p>
          ))}
        </div>
        {children}
      </div>
    </section>
  );
}
