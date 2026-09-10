"use client";

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
            <ul className="text-muted-foreground mt-4 space-y-2.5 text-sm">
              {navigation.support.map((item) => (
                <li
                  key={item.name}
                  className="text-[#FFF7E8] hover:text-[#F2B705]"
                >
                  <Link href={item.href}>{item.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2.5 border-t border-[#3F362A] pt-5 text-sm text-[#9C9179]">
          <p className="text-mute-foreground text-center text-sm sm:text-left">
            &copy; Todos los derechos reservados{" "}
          </p>
          <div className="text-muted-foreground flex items-center gap-4">
            {navigation.social.map((item) => {
              const socialIcon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  aria-label={item.name}
                >
                  <svg
                    role="img"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-white"
                    fill="currentColor"
                  >
                    <path d={socialIcon.path} />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
