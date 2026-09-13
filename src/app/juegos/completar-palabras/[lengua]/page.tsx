import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WordGame } from "@/components/game/word-game";
import { getDictionary, getLanguageCode, getSources } from "@/lib/dictionary";
import { buildItems } from "@/lib/game/items";
import { getLanguage, languages } from "@/lib/languages";

type WordGamePageProps = {
  // The route segment is Spanish because the folder name *is* the public URL.
  params: Promise<{ lengua: string }>;
};

export function generateStaticParams() {
  // Every known language, not just the playable ones: a language we know about
  // explains itself rather than 404ing.
  return languages.map((language) => ({ lengua: language.slug }));
}

export async function generateMetadata({
  params,
}: WordGamePageProps): Promise<Metadata> {
  const { lengua: language } = await params;
  const name = getLanguage(language)?.name;

  if (!name) {
    return { title: "Juego no encontrado" };
  }

  return {
    title: `Completar palabras en ${name}`,
    description: `Practica vocabulario ${name} completando la palabra que falta en una oración.`,
  };
}

export default async function WordGamePage({ params }: WordGamePageProps) {
  const { lengua: language } = await params;
  const name = getLanguage(language)?.name;

  // A language we do not know at all is a 404. One we know but cannot build a
  // pool for is a real page that says so.
  if (!name) {
    notFound();
  }

  const dictionary = getDictionary(language);
  // Availability is derived from the data: no pool, no game. There is no flag
  // to keep in sync.
  const items = dictionary ? buildItems(dictionary.entries) : [];

  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Completar palabras en {name}
      </h1>

      {items.length === 0 ? (
        <p className="mt-4 max-w-[60ch] text-[#4A4130]">
          Todavía no podemos armar el juego en {name}: necesita oraciones de
          ejemplo con fuente, y aún no tenemos ninguna.
        </p>
      ) : (
        <WordGame
          items={items}
          language={language}
          languageCode={getLanguageCode(language) ?? ""}
          sources={getSources()}
        />
      )}
    </main>
  );
}
