import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GameUnavailable } from "@/components/word-jump/game-unavailable";
import { WordJumpGame } from "@/components/word-jump/word-jump-game";
import { getGamePack } from "@/lib/language-bundles/game-pack";
import { getLanguage, languages } from "@/lib/languages";
import { resolveGameState } from "@/lib/word-jump/game-state";

type WordJumpPageProps = {
  // The segment is Spanish because the folder name *is* the public URL.
  params: Promise<{ lengua: string }>;
};

// Both languages are prerendered (spec gestor-lenguas #1) and regenerated
// when their content is published, at most hourly otherwise. The build no
// longer depends on Supabase: a failed read falls back to the repo bundle.
export const revalidate = 3600;

export function generateStaticParams() {
  return languages.map((language) => ({ lengua: language.slug }));
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

  // A failed read in production throws here: the segment's error.tsx shows
  // «not available» on a first visit, and a cached page keeps being served.
  const state = resolveGameState(await getGamePack(language));

  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-8 py-12">
      <Link
        href="/juegos/saltapalabras"
        className="text-sm font-bold text-[#C7431C] underline underline-offset-2"
      >
        Todas las lenguas
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Saltapalabras en {name}
      </h1>

      {state.kind === "unavailable" ? <GameUnavailable /> : null}

      {state.kind === "empty" ? (
        <p className="mt-6 max-w-[60ch] text-[#4A4130]">
          Todavía no hay contenido publicado para esta lengua.
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
            {state.pack.version > 0 ? (
              <p className="mt-2 text-xs text-[#4A4130]">
                Versión {state.pack.version}
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  );
}
