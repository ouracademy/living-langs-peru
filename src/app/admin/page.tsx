import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { checkBasicAuth } from "@/lib/admin/basic-auth";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

type AdminSection = {
  href: string;
  title: string;
  description: string;
};

/** One entry per admin page that exists. */
const SECTIONS: AdminSection[] = [
  {
    href: "/admin/fotos",
    title: "Fotos de la galería asháninka",
    description: "Ver, agregar y corregir las fotos de la página /ashaninka.",
  },
  {
    href: "/admin/lenguas",
    title: "Contenido de las lenguas",
    description:
      "Subir el JSON de asháninka y uro, probarlo y publicarlo: de ahí salen el diccionario y los juegos.",
  },
  {
    href: "/admin/juego",
    title: "Paquetes de Saltapalabras",
    description:
      "Importar, probar y publicar las palabras del juego, y ver su historial.",
  },
];

/**
 * Entry point of the admin area. The proxy already asked for the password;
 * this checks it again rather than trusting the matcher, like /admin/fotos.
 */
export default async function AdminHomePage() {
  const authorization = (await headers()).get("authorization");
  if (checkBasicAuth(authorization) !== "ok") {
    return (
      <main className="mx-auto w-full max-w-[960px] flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold text-[#241D14]">
          Acceso restringido
        </h1>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-6 py-12">
      <h1 className="text-3xl font-bold text-[#241D14]">Administración</h1>
      <p className="mt-3 text-[#4A4130]">Para salir, cierra el navegador.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block rounded-[20px] bg-[#FBEFD2] px-6 py-5 hover:bg-[#F6E3B4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
            >
              <span className="block text-lg font-bold text-[#241D14]">
                {section.title}
              </span>
              <span className="mt-1 block text-sm text-[#4A4130]">
                {section.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
