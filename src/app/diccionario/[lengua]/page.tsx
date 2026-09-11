import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getDictionary,
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
          role="status"
          className="mt-4 rounded-2xl border border-[#E4572E] bg-[#FFF7E8] px-4 py-3 text-sm text-[#241D14]"
        >
          <strong className="font-bold">Contenido provisional.</strong> Estas
          entradas son de andamiaje y no son {name}. El contenido real se añade
          cuando se aprueben las fuentes y su licencia.
        </p>
      )}

      <ul className="mt-8 flex flex-col gap-2">
        {dictionary.entries.map((entry) => (
          <li key={entry.id} className="border-b border-gray-200 pb-2">
            <span className="font-bold">{entry.word}</span>
            <span className="text-[#4A4130]">
              {" — "}
              {entry.translations.join("; ")}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
