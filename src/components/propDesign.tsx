import React from "react";

export default function PropDesign() {
  return (
    <div className="bg-[#FFF7E8] leading-relaxed text-[#241D14]">
      {/* Stripe */}
      <div
        className="h-3 w-full"
        style={{
          background:
            "repeating-linear-gradient(90deg, #E4572E 0 60px, #F2B705 60px 110px, #1B98A0 110px 190px, #6A3E8C 190px 230px)",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FFF7E8]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-8 py-5">
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
            <span className="text-xl font-bold">Lenguas Peruanas</span>
          </div>
          <ul className="hidden list-none gap-2.5 md:flex">
            <li>
              <a
                href="#recursos"
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#241D14] no-underline hover:bg-[#F2B705]"
              >
                Recursos
              </a>
            </li>
            <li>
              <a
                href="#educacion"
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#241D14] no-underline hover:bg-[#F2B705]"
              >
                Aprende
              </a>
            </li>
            <li>
              <a
                href="#historias"
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#241D14] no-underline hover:bg-[#F2B705]"
              >
                Historias
              </a>
            </li>
          </ul>
          <a
            href="#lenguas"
            className="rounded-full bg-[#E4572E] px-5.5 py-2.5 text-sm font-bold text-white no-underline hover:bg-[#C7431C]"
          >
            Elegir lengua
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-10">
        <div className="absolute -top-16 right-32 z-[1] h-[220px] w-[220px] rounded-full bg-[#F2B705] opacity-85 blur-[2px]" />
        <div className="absolute -bottom-10 -left-10 z-[1] h-[160px] w-[160px] rounded-full bg-[#1B98A0] opacity-50 blur-[2px]" />

        <div className="relative z-[2] mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-10 px-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-[0_2px_0_rgba(36,29,20,0.08)]">
              <span className="h-2 w-2 rounded-full bg-[#E4572E]" />
              Asháninka · Uro
            </span>
            <h1 className="my-4 text-4xl leading-tight font-bold md:text-5xl">
              Aprende, juega y <span className="text-[#E4572E]">celebra</span>{" "}
              las lenguas del <span className="text-[#1B98A0]">Perú</span>
            </h1>
            <p className="mb-6 max-w-[38ch] text-lg text-[#4A4130]">
              Diccionario, traductor, chatbot, juegos y videos para aprender
              Asháninka y Uro de forma divertida.
            </p>
            <div className="mt-6 flex flex-wrap gap-3.5">
              <a
                href="#lenguas"
                className="inline-block rounded-full bg-[#E4572E] px-6.5 py-3.5 text-sm font-bold text-white hover:bg-[#C7431C]"
              >
                Elegir una lengua
              </a>
              <a
                href="#educacion"
                className="inline-block rounded-full border-2 border-[#241D14] px-6.5 py-3.5 text-sm font-bold text-[#241D14] hover:bg-[#241D14] hover:text-[#FFF7E8]"
              >
                Aprende jugando
              </a>
            </div>
          </div>

          <div className="relative z-[2]">
            <svg
              viewBox="0 0 420 380"
              xmlns="http://www.w3.org/2000/svg"
              className="h-auto w-full"
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
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="mx-auto mb-11 max-w-[56ch] text-center">
            <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
              Empieza aquí
            </span>
            <h2 className="text-3xl font-bold">
              Elige una lengua para comenzar
            </h2>
            <p className="mt-2.5 text-[#4A4130]">
              Cada lengua tiene su propio mundo de recursos, juegos e historias.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[28px] bg-[#E4572E] p-9 text-white">
              <div className="absolute -top-7 -right-7 h-[140px] w-[140px] rounded-full bg-white/[.18]" />
              <h3 className="mb-2 text-3xl font-bold">Asháninka</h3>
              <p className="mb-4 max-w-[34ch] opacity-95">
                El pueblo indígena más numeroso de la Amazonía peruana.
              </p>
              <a
                href="#"
                className="self-start rounded-full bg-white px-5.5 py-2.5 font-bold text-[#241D14] no-underline"
              >
                Explorar Asháninka
              </a>
            </div>

            <div className="relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[28px] bg-[#1B98A0] p-9 text-white">
              <div className="absolute -top-7 -right-7 h-[140px] w-[140px] rounded-full bg-white/[.18]" />
              <h3 className="mb-2 text-3xl font-bold">Uro</h3>
              <p className="mb-4 max-w-[34ch] opacity-95">
                Herederos de las islas flotantes de totora del lago Titicaca.
              </p>
              <a
                href="#"
                className="self-start rounded-full bg-white px-5.5 py-2.5 font-bold text-[#241D14] no-underline"
              >
                Explorar Uro
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-20">
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="mx-auto mb-11 max-w-[56ch] text-center">
            <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
              Recursos
            </span>
            <h2 className="text-3xl font-bold">
              Todo lo que necesitas para aprender
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 md:grid-cols-5">
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
                className="rounded-[22px] bg-white p-6 shadow-[0_3px_0_rgba(36,29,20,0.06)]"
              >
                <div
                  className={`mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl text-xl text-white ${item.color}`}
                >
                  {item.icon}
                </div>
                <h3 className="mb-1.5 text-lg font-bold">{item.title}</h3>
                <p className="mb-3.5 text-sm text-[#4A4130]">{item.text}</p>
                <a
                  href="#"
                  className="border-b-2 border-[#F2B705] text-sm font-bold text-[#241D14] no-underline"
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
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="mx-auto mb-11 max-w-[56ch] text-center">
            <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
              Centro de educación y ayuda
            </span>
            <h2 className="text-3xl font-bold">
              Aprende de la forma que más te guste
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5.5 md:grid-cols-3">
            <div className="flex min-h-[170px] flex-col justify-between rounded-3xl bg-[#6A3E8C] p-8 text-white">
              <h3 className="text-2xl font-bold">Tutoriales</h3>
              <a href="#" className="text-sm font-bold text-white underline">
                Ver tutoriales →
              </a>
            </div>
            <div className="flex min-h-[170px] flex-col justify-between rounded-3xl bg-[#E4572E] p-8 text-white">
              <h3 className="text-2xl font-bold">Games</h3>
              <a href="#" className="text-sm font-bold text-white underline">
                Aprende jugando →
              </a>
            </div>
            <div className="flex min-h-[170px] flex-col justify-between rounded-3xl bg-[#1B98A0] p-8 text-white">
              <h3 className="text-2xl font-bold">Materiales y video</h3>
              <a href="#" className="text-sm font-bold text-white underline">
                Explorar recursos →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Historias */}
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
              <div key={s.who} className="rounded-[22px] bg-white p-6.5">
                <div className="mb-3.5 h-11 w-11 rounded-full bg-gradient-to-br from-[#E4572E] to-[#6A3E8C]" />
                <q className="mb-3 block text-base font-semibold">{s.quote}</q>
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
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="mx-auto mb-11 max-w-[56ch] text-center">
            <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
              ¿Quieres apoyarnos?
            </span>
            <h2 className="text-3xl font-bold">
              Súmate de la forma que prefieras
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5.5 md:grid-cols-3">
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
                className="rounded-[22px] bg-white p-7 text-center"
              >
                <div
                  className={`mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl text-xl text-white ${item.color}`}
                >
                  {item.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                <p className="mb-4 text-sm text-[#4A4130]">{item.text}</p>
                <a
                  href="#"
                  className="inline-block rounded-full bg-[#241D14] px-5 py-2.5 text-sm font-bold text-white no-underline"
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
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="mx-auto mb-11 max-w-[56ch] text-center">
            <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
              Sponsors
            </span>
            <h2 className="text-3xl font-bold">Organizaciones aliadas</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-5">
            <div className="rounded-2xl bg-white px-6.5 py-4 text-sm font-bold">
              UNMSM
            </div>
            <div className="rounded-2xl bg-white px-6.5 py-4 text-sm font-bold">
              PERÚ — Ministerio de Cultura
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#241D14] pt-14 pb-7 text-[#FFF7E8]">
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="mb-9 grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <h3 className="mb-2.5 text-lg font-bold">Lenguas Peruanas</h3>
              <p className="max-w-[34ch] text-sm text-[#C9BFA8]">
                Iniciativa dedicada a la preservación, difusión y aprendizaje de
                lenguas nativas.
              </p>
            </div>
            <div>
              <h3 className="mb-2.5 text-lg font-bold">Participa</h3>
              <ul className="list-none">
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-sm text-[#FFF7E8] no-underline hover:text-[#F2B705]"
                  >
                    Registrarse como editor
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-sm text-[#FFF7E8] no-underline hover:text-[#F2B705]"
                  >
                    Voluntarios
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-sm text-[#FFF7E8] no-underline hover:text-[#F2B705]"
                  >
                    Donar
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2.5 text-lg font-bold">Explora</h3>
              <ul className="list-none">
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-sm text-[#FFF7E8] no-underline hover:text-[#F2B705]"
                  >
                    Diccionario
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-sm text-[#FFF7E8] no-underline hover:text-[#F2B705]"
                  >
                    Games
                  </a>
                </li>
                <li className="mb-2">
                  <a
                    href="#"
                    className="text-sm text-[#FFF7E8] no-underline hover:text-[#F2B705]"
                  >
                    Historias
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-2.5 border-t border-[#3F362A] pt-5 text-sm text-[#9C9179]">
            <span>© 2026 Lenguas Peruanas</span>
            <span>Facebook · Instagram · X</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
