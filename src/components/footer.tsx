"use client";

import Image from "next/image";
import Link from "next/link";

const navigation = {
  support: [
    { name: "Registrarse como editor", href: "/registro-editor" },
    { name: "Voluntarios", href: "/voluntarios" },
    { name: "Donar", href: "/donar" },
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


      </div>
    </footer>

  )
}