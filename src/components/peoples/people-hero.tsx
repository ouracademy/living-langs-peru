import { Citation } from "@/components/peoples/citation";
import { citationId, citationsFor } from "@/lib/peoples/footnotes";
import type { Footnote } from "@/lib/peoples/footnotes";
import type { People } from "@/lib/peoples";

type PeopleHeroProps = {
  people: People;
  footnotes: Footnote[];
};

export function PeopleHero({ people, footnotes }: PeopleHeroProps) {
  const { language } = people;

  return (
    <section className="bg-[#FFF7E8]">
      <div className="mx-auto max-w-[1180px] px-8 py-16 md:py-20">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#C7431C] px-4 py-1.5 text-sm font-bold text-white">
          Pueblo indígena
        </span>
        <h1 className="text-4xl font-bold text-[#241D14] md:text-5xl">
          {people.name}
        </h1>
        <p className="mt-5 max-w-[60ch] text-lg text-[#4A4130]">
          {people.summary.text}
          <Citation
            anchor={citationId("resumen")}
            numbers={citationsFor(footnotes, people.summary.sourceIds)}
          />
        </p>
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <dt className="text-sm font-bold text-[#4A4130]">
              Familia lingüística
            </dt>
            <dd className="text-lg font-bold text-[#241D14]">
              {language.family}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-[#4A4130]">Códigos ISO</dt>
            <dd className="text-lg font-bold text-[#241D14]">
              {language.isoCodes.join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-[#4A4130]">
              Grafías del alfabeto
            </dt>
            <dd className="text-lg font-bold text-[#241D14]">
              {language.letters}
              <Citation
                anchor={citationId("lengua")}
                numbers={citationsFor(footnotes, language.sourceIds)}
              />
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
