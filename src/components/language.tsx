import Link from "next/link";


const nativeLanguages = [
  {
    InCommunity: "Asháninka",
    overview: "El pueblo indígena más numeroso de la Amazonía peruana.",
    explore: "Explorar Asháninka",
    bgColor: "bg-[#E4572E]",
  },
  {
    InCommunity: "Uro",
    overview: "Herederos de las islas flotantes de totora del lago Titicaca.",
    explore: "Explorar Uro",
    bgColor: "bg-[#1B98A0]",
  },
];

export default function Language() {
  return (
    <section className="bg-[#FBEFD2] py-20">
      <div className="max-w-[1180px] mx-auto px-8">
        <div className="max-w-[56ch] mx-auto mb-11 text-center">
          <span className="inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
            Empieza aquí
          </span>
          <h2 className="font-bold text-3xl">
            Elige una lengua para comenzar
          </h2>
          <p className="text-[#4A4130] mt-2.5">
            Cada lengua tiene su propio mundo de recursos, juegos e historias.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nativeLanguages.map((language) => (
            <div
              key={language.InCommunity}
              className={`rounded-[28px] p-9 text-white relative overflow-hidden min-h-[260px] flex flex-col justify-end ${language.bgColor}`} 
            >
              <div className="absolute -top-7 -right-7 w-[140px] h-[140px] rounded-full bg-white/[.18]" />
              <h3 className="text-3xl font-bold mb-2">
                {language.InCommunity}
              </h3>
              <p className=" opacity-95 max-w-[34ch] mb-4">
                {language.overview}
              </p>
              <Link href="#" className="self-start bg-white text-[#241D14] font-bold px-5.5 py-2.5 rounded-full no-underline">
                {language.explore}
              </Link>              
            </div>
          ))}          
        </div>
      </div>
    </section>
  );
}
