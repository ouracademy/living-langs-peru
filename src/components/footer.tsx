"use client";

import Image from "next/image";
import Link from "next/link";
// import { Facebook } from "lucide-react";

const navigation = {
  support: [
    { name: "Registrarse como editor", href: "/registro-editor" },
    { name: "Voluntarios", href: "/voluntarios" },
    { name: "Donar", href: "/donar" },


  ],
  social: [
    { name: "Facebook", href: "#", icon: "Facebook" },
    // { name: "Instagram", href: "#", icon: },
    // { name: "X", href: "#", icon: }

  ]
}

export function Footer() {
  return (
    <footer className="border-t bg-background text-foreground">
      <div className="mx-auto mx-w-6xl px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 justify-between">
          <div>
            <Link href="/" className="gap-2 text-xl">
              <Image
                src="/logo.webp"
                alt="Lengua plataforma"
                width={100}
                height={100}
                style={{ height: "auto" }}
                className="object-contain"
              />
              <span>Lengua Plataforma</span>
            </Link>
            <p className="text-sm max-w-sm text-muted-foreground leading-relaxed">Iniciativa dedicada a la preservación, difusión y aprendizaje de lenguas nativas</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Participa</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {navigation.support.map((item) => (
                <li key={item.name}>
                  <Link href={item.href}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* Separador */}
        <div className="mt-12 pt-8 border-t flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-mute-foreground text-center sm:text-left">&copy; Todos los derechos reservados </p>
          <div className="flex items-center gap-4 text-muted-foreground">
            {navigation.social.map((item)=> {
              const Icon = item.icon;
              return(
                <a 
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  aria-label={item.name}
                >
                  <Icon />
                </a>
              )
            })}   
          </div>   
        </div>


      </div>
    </footer>

  )
}