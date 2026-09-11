import { BookMarked, Languages, Info, Paperclip } from "lucide-react";
import Link from "next/link";

const resources = [
  {
    icon: BookMarked,
    color: "bg-[#E4572E]",
    title: "Diccionario",
    text: "Palabras y significados en cada lengua.",
    cta: "Buscar",
    href: "/diccionario/ashaninka",
  },
  {
    icon: Languages,
    color: "bg-[#1B98A0]",
    title: "Traductor",
    text: "Traduce frases entre español y cada lengua.",
    cta: "Traducir",
    href: "#",
  },
  {
    icon: Info,
    color: "bg-[#F2B705]",
    title: "Info general",
    text: "Historia y territorio de cada lengua.",
    cta: "Leer más",
    href: "#",
  },
  {
    icon: Paperclip,
    color: "bg-[#241D14]",
    title: "Otros sitios",
    text: "Enlaces a aliados y archivos.",
    cta: "Ver enlaces",
    href: "#",
  },
];

export default function Resources() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-[1180px] px-8">
        <div className="mx-auto mb-11 max-w-[56ch] text-center">
          <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
            Recursos
          </span>
          <h2 className="text-3xl font-bold">
            Todo lo que necesitas para aprender
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 md:grid-cols-4">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <div
                key={resource.title}
                className="flex flex-col justify-between rounded-[22px] border border-gray-300 bg-white p-6 shadow-[0_3px_0_rgba(36,29,20,0.06)]"
              >
                <div>
                  <div
                    className={`mb-3.5 flex h-12 w-12 items-center justify-center ${resource.color} rounded-2xl`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-1.5 text-lg font-bold">{resource.title}</h3>
                  <p className="mb-3.5 text-sm text-[#4A4130]">
                    {resource.text}
                  </p>
                </div>
                <div>
                  <Link
                    href={resource.href}
                    className="border-b-2 border-[#F2B705] text-sm font-bold text-[#241D14] no-underline"
                  >
                    {resource.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
