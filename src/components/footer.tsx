"use client";

import Image from "next/image";
import Link from "next/link";
import { siFacebook, siInstagram, siX } from "simple-icons";

const navigation = {
  support: [
    { name: "Registrarse como editor", href: "/registro-editor" },
    { name: "Voluntarios", href: "/voluntarios" },
    { name: "Donar", href: "/donar" },
  ],
  social: [
    { name: "Facebook", href: "#", icon: siFacebook },
    { name: "Instagram", href: "#", icon: siInstagram },
    { name: "X", href: "#", icon: siX },
  ],
};

export function Footer() {
  return (
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
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {navigation.support.map((item) => (
                <li key={item.name} className="text-[#FFF7E8] hover:text-[#F2B705]">
                  <Link href={item.href}>{item.name}</Link>
                </li>
              ))}
            </ul>
            {/* <ul className="list-none">
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
            </ul> */}
          </div>
          {/* <div>
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
          </div> */}
        </div>
        <div className="border-t border-[#3F362A] pt-5 flex justify-between flex-wrap gap-2.5 text-sm text-[#9C9179]">
          <p className="text-sm text-mute-foreground text-center sm:text-left">
            &copy; Todos los derechos reservados{" "}
          </p>
          <div className="flex items-center gap-4 text-muted-foreground">
            {navigation.social.map((item) => {
              const socialIcon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  aria-label={item.name}
                >
                  <svg role="img" viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
                    <path d={socialIcon.path} />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
    // <footer className="border-t bg-background text-foreground">
    //   <div className="mx-auto mx-w-6xl px-6 py-8 md:py-8">
    //     <div className="grid grid-cols-1 gap-8 md:grid-cols-3 justify-between">
    //       <div>
    //         <Link href="/" className="flex-items-center gap-2 text-xl">
    //           <Image
    //             src="/logo.webp"
    //             alt="Lengua plataforma"
    //             width={100}
    //             height={100}
    //             className="object-contain h-auto w-24"
    //           />
    //           <span>Lenguas Peruanas</span>
    //         </Link>
    //         <p className="text-sm max-w-sm text-muted-foreground leading-relaxed">Iniciativa dedicada a la preservación, difusión y aprendizaje de lenguas nativas</p>
    //       </div>
    //       <div>
    //         <h3 className="text-sm font-semibold text-foreground">Participa</h3>
    //         <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
    //           {navigation.support.map((item) => (
    //             <li key={item.name}>
    //               <Link href={item.href}>
    //                 {item.name}
    //               </Link>
    //             </li>
    //           ))}
    //         </ul>
    //       </div>
    //     </div>
    //     {/* Separador */}
    //     <div className="mt-7 pt-7 border-t flex flex-col items-center justify-between gap-4 sm:flex-row">
    //       <p className="text-sm text-mute-foreground text-center sm:text-left">&copy; Todos los derechos reservados </p>
    //       <div className="flex items-center gap-4 text-muted-foreground">
    //         {navigation.social.map((item) => {
    //           const socialIcon = item.icon;
    //           return (
    //             <a
    //               key={item.name}
    //               href={item.href}
    //               target="_blank"
    //               aria-label={item.name}
    //             >
    //               <svg role="img" viewBox="0 0 24 24" className="h-5 w-5">
    //                 <path d={socialIcon.path} />
    //               </svg>
    //             </a>
    //           )
    //         })}
    //       </div>
    //     </div>
    //   </div>
    // </footer>
  );
}
