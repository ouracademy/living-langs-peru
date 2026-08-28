const testimonials = [
  {
    testimony:
      "Enseñar mi lengua a mis nietos es la forma en que la mantenemos viva.",
    community: "Comunidad Asháninka",
  },
  {
    testimony:
      "El lago nos dio la totora, y la totora nos dio nuestras palabras.",
    community: "Comunidad Uro",
  },
  {
    testimony: "Documentar nuestra lengua es documentar nuestra memoria.",
    community: "Editor voluntario",
  },
];

export default function Stories() {
  return (
    <section id="historias" className="bg-[#FBEFD2] py-20">
      <div className="max-w-[1180px] mx-auto px-8">
        <div className="max-w-[56ch] mx-auto mb-11 text-center">
          <span className="font-['Mulish',sans-serif] inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
            Historias
          </span>
          <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
            Contado en sus propias palabras
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5.5">
          {testimonials.map((indexT) => (
            <div key={indexT.community} className="bg-white rounded-[22px] p-6.5">
              <div className="w-11 h-11 rounded-full mb-3.5 bg-gradient-to-br from-[#E4572E] to-[#6A3E8C]" />
              <q className="block font-['Baloo_2',sans-serif] font-semibold text-base mb-3">
                {indexT.testimony}
              </q>
              <span className="font-['Mulish',sans-serif] text-xs font-bold text-[#6B6152]">{indexT.community}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
