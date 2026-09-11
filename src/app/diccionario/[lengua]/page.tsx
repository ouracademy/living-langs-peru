import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Dictionary } from "@/components/dictionary/dictionary";
import {
  getDictionary,
  getLanguageCode,
  getLanguagesWithDictionary,
  getSources,
  isProvisional,
} from "@/lib/dictionary";
import { getLanguage, languages } from "@/lib/languages";

type DictionaryPageProps = {
  // The route segment is Spanish because the folder name *is* the public URL.
  params: Promise<{ lengua: string }>;
};

export function generateStaticParams() {
  // Every known language, not just those with data: a language we know about
  // renders an explanation rather than a 404.
  return languages.map((language) => ({ lengua: language.slug }));
}

export async function generateMetadata({
  params,
}: DictionaryPageProps): Promise<Metadata> {
  const { lengua: language } = await params;
  const name = getLanguage(language)?.name;

  if (!name) {
    return { title: "Diccionario no encontrado" };
  }

  if (!getDictionary(language)) {
    return {
      title: `Diccionario ${name}`,
      description: `El diccionario ${name} aún no está disponible.`,
    };
  }

  return {
    title: `Diccionario ${name}`,
    description: `Palabras y significados en ${name}, con ejemplos de uso.`,
  };
}

function UnavailableDictionary({ name }: { name: string }) {
  const available = getLanguagesWithDictionary();

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Diccionario {name}</h1>
      <p className="mt-4 max-w-[60ch] text-[#4A4130]">
        Aún no tenemos entradas en {name}. Estamos buscando fuentes con licencia
        y permiso para hacerlo bien: preferimos no publicar nada antes que
        publicar datos sin respaldo.
      </p>

      <h2 className="mt-8 font-bold">Diccionarios disponibles</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {available.map((item) => (
          <li key={item.slug}>
            <Link href={`/diccionario/${item.slug}`} className="underline">
              {item.name}
            </Link>{" "}
            <span className="text-[#4A4130]">({item.total} palabras)</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default async function DictionaryPage({ params }: DictionaryPageProps) {
  const { lengua: language } = await params;
  const dictionary = getDictionary(language);
  const name = getLanguage(language)?.name;

  // A language we do not know at all is a 404. One we know but have no data
  // for is a real page that says so: a shared link should not dead-end.
  if (!name) {
    notFound();
  }

  if (!dictionary) {
    return <UnavailableDictionary name={name} />;
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
          sources={getSources()}
        />
      </Suspense>

      <footer className="mt-12 border-t border-gray-200 pt-6 text-sm text-[#4A4130]">
        <h2 className="font-bold">Fuentes</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {getSources().map((source) => (
            <li key={source.id}>
              <a
                href={source.url}
                className="underline"
                rel="noreferrer noopener"
              >
                {source.title}
              </a>
              {source.authors && `, ${source.authors.join("; ")}`}.{" "}
              {source.publisher}, {source.year}.
              {source.note && <span className="block">{source.note}</span>}
            </li>
          ))}
        </ul>
      </footer>
    </main>
  );
}
