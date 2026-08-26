import React from "react";

export default function PropDesign() {
  return (
    <div className="bg-[#FFF7E8] text-[#241D14] font-['Mulish',sans-serif] leading-relaxed">
      {/* Stripe */}
      <div
        className="h-3 w-full"
        style={{
          background:
            "repeating-linear-gradient(90deg, #E4572E 0 60px, #F2B705 60px 110px, #1B98A0 110px 190px, #6A3E8C 190px 230px)",
        }}
      />

      {/* Header */}
      <header className="bg-[#FFF7E8] sticky top-0 z-50">
        <div className="max-w-[1180px] mx-auto px-8 flex items-center justify-between py-5">
          <div className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 30 30">
              <circle cx="15" cy="15" r="8" fill="#E4572E" />
              <circle
                cx="15"
                cy="15"
                r="13"
                stroke="#1B98A0"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <span className="font-['Baloo_2',sans-serif] font-bold text-xl">
              Lenguas Peruanas
            </span>
          </div>
          <ul className="hidden md:flex gap-2.5 list-none">
            <li>
              <a
                href="#recursos"
                className="text-[#241D14] no-underline font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-[#F2B705]"
              >
                Recursos
              </a>
            </li>
            <li>
              <a
                href="#educacion"
                className="text-[#241D14] no-underline font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-[#F2B705]"
              >
                Aprende
              </a>
            </li>
            <li>
              <a
                href="#historias"
                className="text-[#241D14] no-underline font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-[#F2B705]"
              >
                Historias
              </a>
            </li>
          </ul>
          <a
            href="#lenguas"
            className="font-['Baloo_2',sans-serif] font-bold text-sm bg-[#E4572E] text-white px-5.5 py-2.5 rounded-full no-underline hover:bg-[#C7431C]"
          >
            Elegir lengua
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 pb-10 overflow-hidden">
        <div className="absolute rounded-full opacity-85 blur-[2px] w-[220px] h-[220px] bg-[#F2B705] -top-16 right-32 z-[1]" />
        <div className="absolute rounded-full opacity-50 blur-[2px] w-[160px] h-[160px] bg-[#1B98A0] -bottom-10 -left-10 z-[1]" />

        <div className="max-w-[1180px] mx-auto px-8 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-10 items-center relative z-[2]">
          <div>
            <span className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full font-bold text-sm shadow-[0_2px_0_rgba(36,29,20,0.08)]">
              <span className="w-2 h-2 rounded-full bg-[#E4572E]" />
              Asháninka · Uro
            </span>
            <h1 className="font-['Baloo_2',sans-serif] font-bold text-4xl md:text-5xl leading-tight my-4">
              Aprende, juega y <span className="text-[#E4572E]">celebra</span>{" "}
              las lenguas del <span className="text-[#1B98A0]">Perú</span>
            </h1>
            <p className="text-lg text-[#4A4130] max-w-[38ch] mb-6">
              Diccionario, traductor, chatbot, juegos y videos para aprender
              Asháninka y Uro de forma divertida.
            </p>
            <div className="flex gap-3.5 flex-wrap mt-6">
              <a
                href="#lenguas"
                className="font-['Baloo_2',sans-serif] font-bold text-sm px-6.5 py-3.5 rounded-full inline-block bg-[#E4572E] text-white hover:bg-[#C7431C]"
              >
                Elegir una lengua
              </a>
              <a
                href="#educacion"
                className="font-['Baloo_2',sans-serif] font-bold text-sm px-6.5 py-3.5 rounded-full inline-block border-2 border-[#241D14] text-[#241D14] hover:bg-[#241D14] hover:text-[#FFF7E8]"
              >
                Aprende jugando
              </a>
            </div>
          </div>

          <div className="relative z-[2]">
            <svg
              viewBox="0 0 420 380"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto"
            >
              <circle cx="210" cy="190" r="150" fill="#F2B705" opacity=".9" />
              <path
                d="M210 60 C 260 100 260 160 210 200 C 160 160 160 100 210 60Z"
                fill="#E4572E"
              />
              <path
                d="M110 220 C 150 250 150 300 110 330 C 70 300 70 250 110 220Z"
                fill="#1B98A0"
              />
              <path
                d="M310 220 C 350 250 350 300 310 330 C 270 300 270 250 310 220Z"
                fill="#6A3E8C"
              />
              <circle cx="210" cy="330" r="18" fill="#241D14" />
            </svg>
          </div>
        </div>
      </section>

      {/* Lenguas */}
      <section id="lenguas" className="bg-[#FBEFD2] py-20">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-[56ch] mx-auto mb-11 text-center">
            <span className="inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
              Empieza aquí
            </span>
            <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
              Elige una lengua para comenzar
            </h2>
            <p className="text-[#4A4130] mt-2.5">
              Cada lengua tiene su propio mundo de recursos, juegos e historias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[28px] p-9 text-white relative overflow-hidden min-h-[260px] flex flex-col justify-end bg-[#E4572E]">
              <div className="absolute -top-7 -right-7 w-[140px] h-[140px] rounded-full bg-white/[.18]" />
              <h3 className="text-3xl font-['Baloo_2',sans-serif] font-bold mb-2">
                Asháninka
              </h3>
              <p className="opacity-95 max-w-[34ch] mb-4">
                El pueblo indígena más numeroso de la Amazonía peruana.
              </p>
              <a
                href="#"
                className="self-start bg-white text-[#241D14] font-bold px-5.5 py-2.5 rounded-full no-underline font-['Baloo_2',sans-serif]"
              >
                Explorar Asháninka
              </a>
            </div>

            <div className="rounded-[28px] p-9 text-white relative overflow-hidden min-h-[260px] flex flex-col justify-end bg-[#1B98A0]">
              <div className="absolute -top-7 -right-7 w-[140px] h-[140px] rounded-full bg-white/[.18]" />
              <h3 className="text-3xl font-['Baloo_2',sans-serif] font-bold mb-2">
                Uro
              </h3>
              <p className="opacity-95 max-w-[34ch] mb-4">
                Herederos de las islas flotantes de totora del lago Titicaca.
              </p>
              <a
                href="#"
                className="self-start bg-white text-[#241D14] font-bold px-5.5 py-2.5 rounded-full no-underline font-['Baloo_2',sans-serif]"
              >
                Explorar Uro
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-20">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-[56ch] mx-auto mb-11 text-center">
            <span className="inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
              Recursos
            </span>
            <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
              Todo lo que necesitas para aprender
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4.5">
            {[
              {
                icon: "📖",
                color: "bg-[#E4572E]",
                title: "Diccionario",
                text: "Palabras y significados de cada lengua.",
                cta: "Buscar",
              },
              {
                icon: "🌐",
                color: "bg-[#1B98A0]",
                title: "Traductor",
                text: "Traduce frases entre español y cada lengua.",
                cta: "Traducir",
              },
              {
                icon: "💬",
                color: "bg-[#6A3E8C]",
                title: "Chatbot",
                text: "Practica conversaciones con un asistente.",
                cta: "Conversar",
              },
              {
                icon: "ℹ︎",
                color: "bg-[#F2B705] text-[#241D14]",
                title: "Info general",
                text: "Historia y territorio de cada lengua.",
                cta: "Leer más",
              },
              {
                icon: "🔗",
                color: "bg-[#241D14]",
                title: "Otros sitios",
                text: "Enlaces a aliados y archivos.",
                cta: "Ver enlaces",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-[22px] p-6 shadow-[0_3px_0_rgba(36,29,20,0.06)]"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-3.5 text-white ${item.color}`}
                >
                  {item.icon}
                </div>
                <h3 className="font-['Baloo_2',sans-serif] font-bold text-lg mb-1.5">
                  {item.title}
                </h3>
                <p className="text-sm text-[#4A4130] mb-3.5">{item.text}</p>
                <a
                  href="#"
                  className="font-bold text-sm text-[#241D14] no-underline border-b-2 border-[#F2B705]"
                >
                  {item.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Educación */}
      <section id="educacion" className="bg-[#FBEFD2] py-20">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-[56ch] mx-auto mb-11 text-center">
            <span className="inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
              Centro de educación y ayuda
            </span>
            <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
              Aprende de la forma que más te guste
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5.5">
            <div className="rounded-3xl p-8 text-white min-h-[170px] flex flex-col justify-between bg-[#6A3E8C]">
              <h3 className="text-2xl font-['Baloo_2',sans-serif] font-bold">
                Tutoriales
              </h3>
              <a href="#" className="text-white font-bold underline text-sm">
                Ver tutoriales →
              </a>
            </div>
            <div className="rounded-3xl p-8 text-white min-h-[170px] flex flex-col justify-between bg-[#E4572E]">
              <h3 className="text-2xl font-['Baloo_2',sans-serif] font-bold">
                Games
              </h3>
              <a href="#" className="text-white font-bold underline text-sm">
                Aprende jugando →
              </a>
            </div>
            <div className="rounded-3xl p-8 text-white min-h-[170px] flex flex-col justify-between bg-[#1B98A0]">
              <h3 className="text-2xl font-['Baloo_2',sans-serif] font-bold">
                Materiales y video
              </h3>
              <a href="#" className="text-white font-bold underline text-sm">
                Explorar recursos →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Historias */}
      <section id="historias" className="bg-[#FBEFD2] py-20">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-[56ch] mx-auto mb-11 text-center">
            <span className="inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
              Historias
            </span>
            <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
              Contado en sus propias palabras
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5.5">
            {[
              {
                quote:
                  "Enseñar mi lengua a mis nietos es la forma en que la mantenemos viva.",
                who: "Comunidad Asháninka",
              },
              {
                quote:
                  "El lago nos dio la totora, y la totora nos dio nuestras palabras.",
                who: "Comunidad Uro",
              },
              {
                quote:
                  "Documentar nuestra lengua es documentar nuestra memoria.",
                who: "Editor voluntario",
              },
            ].map((s) => (
              <div key={s.who} className="bg-white rounded-[22px] p-6.5">
                <div className="w-11 h-11 rounded-full mb-3.5 bg-gradient-to-br from-[#E4572E] to-[#6A3E8C]" />
                <q className="block font-['Baloo_2',sans-serif] font-semibold text-base mb-3">
                  {s.quote}
                </q>
                <span className="text-xs font-bold text-[#6B6152]">
                  {s.who}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apóyanos */}
      <section id="apoyanos" className="py-20">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-[56ch] mx-auto mb-11 text-center">
            <span className="inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
              ¿Quieres apoyarnos?
            </span>
            <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
              Súmate de la forma que prefieras
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5.5">
            {[
              {
                icon: "✎",
                color: "bg-[#E4572E]",
                title: "Registrarse como editor",
                text: "Ayúdanos a traducir y validar información.",
                cta: "Crear cuenta",
              },
              {
                icon: "♥",
                color: "bg-[#1B98A0]",
                title: "Voluntarios",
                text: "Súmate a nuestro equipo del proyecto.",
                cta: "Unirme",
              },
              {
                icon: "✦",
                color: "bg-[#6A3E8C]",
                title: "Donar",
                text: "Ayúdanos a mantener la plataforma viva.",
                cta: "Donar",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-[22px] p-7 text-center"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-3.5 mx-auto text-white ${item.color}`}
                >
                  {item.icon}
                </div>
                <h3 className="font-['Baloo_2',sans-serif] font-bold text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[#4A4130] mb-4">{item.text}</p>
                <a
                  href="#"
                  className="inline-block bg-[#241D14] text-white font-bold px-5 py-2.5 rounded-full no-underline font-['Baloo_2',sans-serif] text-sm"
                >
                  {item.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors */}
      <section className="bg-[#FBEFD2] py-20">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-[56ch] mx-auto mb-11 text-center">
            <span className="inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
              Sponsors
            </span>
            <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
              Organizaciones aliadas
            </h2>
          </div>
          <div className="flex justify-center gap-5 flex-wrap">
            <div className="bg-white px-6.5 py-4 rounded-2xl font-bold text-sm">
              UNMSM
            </div>
            <div className="bg-white px-6.5 py-4 rounded-2xl font-bold text-sm">
              PERÚ — Ministerio de Cultura
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#241D14] text-[#FFF7E8] pt-14 pb-7">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 mb-9">
            <div>
              <h3 className="font-['Baloo_2',sans-serif] font-bold text-lg mb-2.5">
                Lenguas Peruanas
              </h3>
              <p className="text-[#C9BFA8] text-sm max-w-[34ch]">
                Iniciativa dedicada a la preservación, difusión y aprendizaje de
                lenguas nativas.
              </p>
            </div>
            <div>
              <h3 className="font-['Baloo_2',sans-serif] font-bold text-lg mb-2.5">
                Participa
              </h3>
              <ul className="list-none">
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-[#FFF7E8] no-underline text-sm hover:text-[#F2B705]"
                  >
                    Registrarse como editor
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-[#FFF7E8] no-underline text-sm hover:text-[#F2B705]"
                  >
                    Voluntarios
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-[#FFF7E8] no-underline text-sm hover:text-[#F2B705]"
                  >
                    Donar
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-['Baloo_2',sans-serif] font-bold text-lg mb-2.5">
                Explora
              </h3>
              <ul className="list-none">
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-[#FFF7E8] no-underline text-sm hover:text-[#F2B705]"
                  >
                    Diccionario
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-[#FFF7E8] no-underline text-sm hover:text-[#F2B705]"
                  >
                    Games
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-[#FFF7E8] no-underline text-sm hover:text-[#F2B705]"
                  >
                    Historias
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#3F362A] pt-5 flex justify-between flex-wrap gap-2.5 text-sm text-[#9C9179]">
            <span>© 2026 Lenguas Peruanas</span>
            <span>Facebook · Instagram · X</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
