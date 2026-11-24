import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Dictionary } from "@/components/dictionary/dictionary";
import { getLanguageCode, isProvisional, type Source } from "@/lib/dictionary";
import {
  getDictionaryContent,
  getLanguagesWithContent,
} from "@/lib/dictionary/content";
import { getLanguage, languages } from "@/lib/languages";

type DictionaryPageProps = {
  // The route segment is Spanish because the folder name *is* the public URL.
  params: Promise<{ lengua: string }>;
};

// Both languages are prerendered and regenerated when their bundle is
// published (spec gestor-lenguas #1, #5), at most hourly otherwise.
export const revalidate = 3600;

export function generateStaticParams() {
  // Every known language, not just those with content: a language we know
  // about renders an explanation rather than a 404.
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

  if (!(await getDictionaryContent(language))) {
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

async function UnavailableDictionary({ name }: { name: string }) {
  const available = await getLanguagesWithContent();

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Diccionario {name}</h1>
      <p className="mt-4 max-w-[60ch] text-[#4A4130]">
        Todavía no hay contenido publicado para esta lengua.
      </p>

      {available.length > 0 && (
        <>
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
        </>
      )}
    </main>
  );
}

/** «Título, Autores. Editorial, Año.» with only the parts the source has. */
function SourceLine({ source }: { source: Source }) {
  const imprint = [source.publisher, source.year].filter(
    (part) => part !== undefined && part !== "",
  );
  return (
    <li>
      {source.url ? (
        <a href={source.url} className="underline" rel="noreferrer noopener">
          {source.title}
        </a>
      ) : (
        source.title
      )}
      {source.authors && `, ${source.authors.join("; ")}`}.
      {imprint.length > 0 && ` ${imprint.join(", ")}.`}
      {source.note && <span className="block">{source.note}</span>}
    </li>
  );
}

export default async function DictionaryPage({ params }: DictionaryPageProps) {
  const { lengua: language } = await params;
  const name = getLanguage(language)?.name;

  // A language we do not know at all is a 404. One we know but have no
  // content for is a real page that says so: a shared link should not
  // dead-end.
  if (!name) {
    notFound();
  }

  const content = await getDictionaryContent(language);

  if (!content) {
    return <UnavailableDictionary name={name} />;
  }

  const { dictionary, sources, alphabet } = content;
  const available = await getLanguagesWithContent();

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
          availableLanguages={available.map((item) => item.slug)}
          sources={sources}
          alphabet={alphabet}
        />
      </Suspense>

      <footer className="mt-12 border-t border-gray-200 pt-6 text-sm text-[#4A4130]">
        <h2 className="font-bold">Fuentes</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {sources.map((source) => (
            <SourceLine key={source.id} source={source} />
          ))}
        </ul>
      </footer>
    </main>
  );
}
