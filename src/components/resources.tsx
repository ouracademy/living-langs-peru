import { BookMarked, Languages, Info, Paperclip } from "lucide-react" 

const resources = [
  {
    icon: BookMarked,
    color: "bg-[#E4572E]",
    title: "Diccionario",
    text: "Palabras y significados en cada lengua.",
    cta: "Buscar",
  },
  {
    icon: Languages,
    color: "bg-[#1B98A0]",
    title: "Traductor",
    text: "Traduce frases entre español y cada lengua.",
    cta: "Traducir",
  },
  {
    icon: Info,
    color: "bg-[#F2B705]",
    title: "Info general",
    text: "Historia y territorio de cada lengua.",
    cta: "Leer más",
  },
  {
    icon: Paperclip,
    color: "bg-[#241D14]",
    title: "Otros sitios",
    text: "Enlaces a aliados y archivos.",
    cta: "Ver enlaces",
  },
];

export default function Resources() {
  return (
    <section className="py-20">
      <div className="max-w-[1180px] mx-auto px-8">
        <div className="max-w-[56ch] mx-auto mb-11 text-center">
          <span className="font-['Mulish' ,sans-serif] inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
            Recursos
          </span>
          <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
            Todo lo que necesitas para aprender
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4.5">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <div
                key={resource.title}
                className="bg-white rounded-[22px] p-6 shadow-[0_3px_0_rgba(36,29,20,0.06)]"
              >
                <div className={`flex h-12 w-12 items-center justify-center ${resource.color} rounded-2xl `}>
                  <Icon className="w-6 h-6 text-white" />
                </div>              
                <h3 className="font-['Baloo_2',sans-serif] font-bold text-lg mb-1.5">
                  {resource.title}
                </h3>
                <p className="font-['Mulish',sans-serif] text-sm text-[#4A4130] mb-3.5">
                  {resource.text}
                </p>
                <a
                  href="#"
                  className="font-['Mulish',sans-serif] font-bold text-sm text-[#241D14] no-underline border-b-2 border-[#F2B705]"
                >
                  {resource.cta}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
