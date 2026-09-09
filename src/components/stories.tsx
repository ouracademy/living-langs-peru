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
      <div className="mx-auto max-w-[1180px] px-8">
        <div className="mx-auto mb-11 max-w-[56ch] text-center">
          <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
            Historias
          </span>
          <h2 className="text-3xl font-bold">
            Contado en sus propias palabras
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5.5 md:grid-cols-3">
          {testimonials.map((indexT) => (
            <div
              key={indexT.community}
              className="rounded-[22px] bg-white p-6.5"
            >
              <div className="mb-3.5 h-11 w-11 rounded-full bg-gradient-to-br from-[#E4572E] to-[#6A3E8C]" />
              <q className="mb-3 block text-base font-semibold">
                {indexT.testimony}
              </q>
              <span className="text-xs font-bold text-[#6B6152]">
                {indexT.community}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
