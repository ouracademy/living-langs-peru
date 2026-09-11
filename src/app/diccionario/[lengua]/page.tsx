import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Dictionary } from "@/components/dictionary/dictionary";
import {
  getDictionary,
  getLanguageCode,
  getLanguagesWithDictionary,
  isProvisional,
} from "@/lib/dictionary";
import { getLanguage } from "@/lib/languages";

type DictionaryPageProps = {
  // The route segment is Spanish because the folder name *is* the public URL.
  params: Promise<{ lengua: string }>;
};

export function generateStaticParams() {
  return getLanguagesWithDictionary().map((language) => ({
    lengua: language.slug,
  }));
}

export async function generateMetadata({
  params,
}: DictionaryPageProps): Promise<Metadata> {
  const { lengua: language } = await params;
  const name = getLanguage(language)?.name;

  if (!name || !getDictionary(language)) {
    return { title: "Diccionario no encontrado" };
  }

  return {
    title: `Diccionario ${name}`,
    description: `Palabras y significados en ${name}, con ejemplos de uso.`,
  };
}

export default async function DictionaryPage({ params }: DictionaryPageProps) {
  const { lengua: language } = await params;
  const dictionary = getDictionary(language);
  const name = getLanguage(language)?.name;

  if (!dictionary || !name) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Diccionario {name}</h1>

      {isProvisional(dictionary) && (
        <p
          // Static informational copy, so not a live region: role="status"
          // would make screen readers announce it as a change, and it would
          // collide with the search result counter.
          className="mt-4 rounded-2xl border border-[#E4572E] bg-[#FFF7E8] px-4 py-3 text-sm text-[#241D14]"
        >
          <strong className="font-bold">Contenido provisional.</strong> Estas
          entradas son de andamiaje y no son {name}. El contenido real se añade
          cuando se aprueben las fuentes y su licencia.
        </p>
      )}

      {/* Suspense lets everything above stay in the prerendered HTML while the
          part that reads ?palabra via useSearchParams renders on the client. */}
      <Suspense fallback={null}>
        <Dictionary
          // Remounts on a language change, so no client state leaks across.
          key={language}
          entries={dictionary.entries}
          language={language}
          languageName={name}
          languageCode={getLanguageCode(language) ?? ""}
          availableLanguages={getLanguagesWithDictionary().map(
            (item) => item.slug,
          )}
        />
      </Suspense>
    </main>
  );
}
