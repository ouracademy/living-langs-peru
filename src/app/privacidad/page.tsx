import type { Metadata } from "next";

import { PolicyBlock } from "@/components/privacy/policy-block";
import { privacyPolicy } from "@/lib/privacy/policy";

// Static: the route has no params and reads nothing from the request.
export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos guardamos cuando envías el formulario de apoyo, para qué los usamos y cómo pedir que los borremos.",
};

export default function PrivacyPage() {
  const { title, updatedAt, intro, sections } = privacyPolicy;

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-[#FFF7E8]">
        <div className="mx-auto max-w-[1180px] px-8 py-16 md:py-20">
          <h1 className="text-4xl font-bold text-[#241D14] md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm font-bold text-[#4A4130]">
            Última actualización: {updatedAt}
          </p>
          <p className="mt-6 max-w-[70ch] text-lg leading-relaxed text-[#4A4130]">
            {intro}
          </p>
        </div>
      </section>
      {sections.map((section, index) => {
        const titleId = `${section.id}-title`;
        return (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={titleId}
            className={`scroll-mt-24 ${index % 2 === 0 ? "bg-white" : "bg-[#FFF7E8]"}`}
          >
            <div className="mx-auto max-w-[1180px] px-8 py-12">
              <h2 id={titleId} className="text-2xl font-bold text-[#241D14]">
                {section.title}
              </h2>
              <div className="mt-6 flex max-w-[70ch] flex-col gap-4">
                {section.blocks.map((block, blockIndex) => (
                  <PolicyBlock key={blockIndex} block={block} />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </main>
  );
}
