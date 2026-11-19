import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GameUnavailable } from "@/components/word-jump/game-unavailable";
import { WordJumpGame } from "@/components/word-jump/word-jump-game";
import { getPublishedPack } from "@/lib/language-packs/library";
import { getLanguage } from "@/lib/languages";
import {
  LANGUAGES_WITHOUT_PACK,
  hasNoPack,
} from "@/lib/word-jump/availability";
import { resolveGameState } from "@/lib/word-jump/game-state";

type WordJumpPageProps = {
  // The segment is Spanish because the folder name *is* the public URL.
  params: Promise<{ lengua: string }>;
};

// ISR (decision #8): each language is generated on its first visit and
// regenerated at most hourly, or when a publish revalidates its tag.
export const revalidate = 3600;

/**
 * Empty on purpose: no language is rendered at build time, so the build never
 * calls Supabase (AC-SP3-10). Returning an array — even an empty one — is what
 * keeps the route cacheable instead of dynamic.
 */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: WordJumpPageProps): Promise<Metadata> {
  const { lengua: language } = await params;
  const name = getLanguage(language)?.name;

  return name
    ? { title: `Saltapalabras en ${name}` }
    : { title: "Juego no encontrado" };
}

export default async function WordJumpPage({ params }: WordJumpPageProps) {
  const { lengua: language } = await params;
  const name = getLanguage(language)?.name;

  if (!name) notFound();

  const back = (
    <Link
      href="/juegos/saltapalabras"
      className="text-sm font-bold text-[#C7431C] underline underline-offset-2"
    >
      Todas las lenguas
    </Link>
  );

  // Known without asking the database (AC-SP4-9).
  if (hasNoPack(language)) {
    return (
      <main className="mx-auto w-full max-w-[720px] flex-1 px-8 py-12">
        {back}
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Saltapalabras en {name}
        </h1>
        <p className="mt-4 max-w-[60ch] text-[#4A4130]">
          No hay juego en {name}. {LANGUAGES_WITHOUT_PACK[language]}
        </p>
      </main>
    );
  }

  // A failed read throws here: the segment's error.tsx shows «not available»
  // on a first visit, and a cached page keeps being served after that.
  const state = resolveGameState(await getPublishedPack(language));

  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-8 py-12">
      {back}
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Saltapalabras en {name}
      </h1>

      {state.kind === "unavailable" ? <GameUnavailable /> : null}

      {state.kind === "empty" ? (
        <p className="mt-6 max-w-[60ch] text-[#4A4130]">
          Todavía no hay palabras verificadas para jugar en {name}. Las estamos
          preparando con hablantes y fuentes citadas.
        </p>
      ) : null}

      {state.kind === "ready" ? (
        <>
          <p className="mt-2 text-[#4A4130]">{state.pack.language.title}</p>
          <WordJumpGame pack={state.pack} />
          <section aria-labelledby="fuentes" className="mt-12">
            <h2 id="fuentes" className="font-bold">
              Fuentes
            </h2>
            <ul className="mt-2 text-sm text-[#4A4130]">
              {state.pack.sources.map((source) => (
                <li key={source.id}>
                  {source.url ? (
                    <a
                      href={source.url}
                      className="underline underline-offset-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {source.title}
                    </a>
                  ) : (
                    source.title
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[#4A4130]">
              Versión {state.pack.version}
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}
