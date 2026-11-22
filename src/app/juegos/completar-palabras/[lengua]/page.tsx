import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UnavailableGame } from "@/components/game/unavailable-game";
import { WordGame } from "@/components/game/word-game";
import { getLanguageCode } from "@/lib/dictionary";
import {
  getDictionaryContent,
  getLanguagesWithContent,
} from "@/lib/dictionary/content";
import { buildItems } from "@/lib/game/items";
import { getLanguage, languages } from "@/lib/languages";

type WordGamePageProps = {
  // The route segment is Spanish because the folder name *is* the public URL.
  params: Promise<{ lengua: string }>;
};

// Both languages are prerendered and regenerated when their bundle is
// published (spec gestor-lenguas #1, #5), at most hourly otherwise.
export const revalidate = 3600;

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

/**
 * Languages that actually yield a pool. Derived from the content, so there is
 * no flag to keep in sync with reality.
 */
async function playableLanguages() {
  const withContent = await getLanguagesWithContent();
  const pools = await Promise.all(
    withContent.map(async ({ slug, name }) => {
      const content = await getDictionaryContent(slug);
      const items = content ? buildItems(content.dictionary.entries) : [];
      return items.length > 0 ? [{ slug, name }] : [];
    }),
  );
  return pools.flat();
}

export default async function WordGamePage({ params }: WordGamePageProps) {
  const { lengua: language } = await params;
  const name = getLanguage(language)?.name;

  // A language we do not know at all is a 404. One we know but cannot build a
  // pool for is a real page that says so.
  if (!name) {
    notFound();
  }

  const content = await getDictionaryContent(language);
  // Availability is derived from the content: no pool, no game.
  const items = content ? buildItems(content.dictionary.entries) : [];

  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Completar palabras en {name}
      </h1>

      {!content || items.length === 0 ? (
        <UnavailableGame
          name={name}
          reason={content ? "no-examples" : "no-content"}
          playable={await playableLanguages()}
        />
      ) : (
        <WordGame
          items={items}
          language={language}
          languageCode={getLanguageCode(language) ?? ""}
          sources={content.sources}
        />
      )}
    </main>
  );
}
