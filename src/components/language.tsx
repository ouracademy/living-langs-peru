import Link from "next/link";

const nativeLanguages = [
  {
    InCommunity: "Asháninka",
    overview: "El pueblo indígena más numeroso de la Amazonía peruana.",
    explore: "Explorar Asháninka",
    bgColor: "bg-[#E4572E]",
    href: "/ashaninka",
  },
  {
    InCommunity: "Uro",
    overview: "Herederos de las islas flotantes de totora del lago Titicaca.",
    explore: "Explorar Uro",
    bgColor: "bg-[#1B98A0]",
    href: "/lenguas/uro",
  },
];

export default function Language() {
  return (
    <section id="lenguas" className="scroll-mt-24 bg-[#FBEFD2] py-20">
      <div className="mx-auto max-w-[1180px] px-8">
        <div className="mx-auto mb-11 max-w-[56ch] text-center">
          <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
            Empieza aquí
          </span>
          <h2 className="text-3xl font-bold">Elige una lengua para comenzar</h2>
          <p className="mt-2.5 text-[#4A4130]">
            Cada lengua tiene su propio mundo de recursos, juegos e historias.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {nativeLanguages.map((language) => (
            <div
              key={language.InCommunity}
              className={`relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[28px] p-9 text-white ${language.bgColor}`}
            >
              <div className="absolute -top-7 -right-7 h-[140px] w-[140px] rounded-full bg-white/[.18]" />
              <h3 className="mb-2 text-3xl font-bold">
                {language.InCommunity}
              </h3>
              <p className="mb-4 max-w-[34ch] opacity-95">
                {language.overview}
              </p>
              <Link
                href={language.href}
                className="self-start rounded-full bg-white px-5.5 py-2.5 font-bold text-[#241D14] no-underline"
              >
                {language.explore}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
