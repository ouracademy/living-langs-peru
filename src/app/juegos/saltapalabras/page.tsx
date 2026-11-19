import type { Metadata } from "next";
import Link from "next/link";

import { languages } from "@/lib/languages";
import {
  LANGUAGES_WITHOUT_PACK,
  hasNoPack,
} from "@/lib/word-jump/availability";

export const metadata: Metadata = {
  title: "Saltapalabras",
  description:
    "Un juego de vocabulario para todas las edades: elige la palabra y salta.",
};

/**
 * The library (spec §6.4): built from src/lib/languages.ts only, never from
 * the database, so it is static and does not depend on Supabase. Each language
 * page says whether it has a pack.
 */
export default function WordJumpLibraryPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Saltapalabras</h1>
      <p className="mt-3 max-w-[60ch] text-[#4A4130]">
        Mira el dibujo, elige la palabra y ayuda al personaje a saltar. Se juega
        sin registrarse.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {languages.map((language) =>
          hasNoPack(language.slug) ? (
            <li
              key={language.slug}
              className="rounded-[20px] bg-[#FBEFD2] px-6 py-5"
            >
              <span className="block text-lg font-bold">{language.name}</span>
              <span className="mt-1 block text-sm text-[#4A4130]">
                Sin juego. {LANGUAGES_WITHOUT_PACK[language.slug]}
              </span>
            </li>
          ) : (
            <li key={language.slug}>
              <Link
                href={`/juegos/saltapalabras/${language.slug}`}
                className="block rounded-[20px] bg-[#FBEFD2] px-6 py-5 hover:bg-[#F6E3B4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
              >
                <span className="block text-lg font-bold">
                  Jugar en {language.name}
                </span>
              </Link>
            </li>
          ),
        )}
      </ul>
    </main>
  );
}
