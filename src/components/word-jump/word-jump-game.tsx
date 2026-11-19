"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import type { GameMode, Theme } from "@/lib/language-packs/types";
import type { PublicPack } from "@/lib/word-jump/game-state";
import {
  getServerSnapshot,
  getSnapshot,
  saveRound,
  subscribe,
} from "@/lib/word-jump/progress-store";
import {
  type RoundContext,
  type RoundState,
  answerQuestion,
  buildRound,
  createRound,
  nextQuestion,
  roundOutcomes,
} from "@/lib/word-jump/round";
import type { LanguageProgress } from "@/lib/word-jump/stats";

import { RoundView, buttonClass } from "./round-view";

type WordJumpGameProps = {
  /** Already filtered by `playableThemes` on the server. */
  pack: PublicPack;
};

const MODE_NAMES: Record<GameMode, string> = {
  pic2word: "Dibujo → palabra",
  listen: "Escuchar → palabra",
  word2pic: "Palabra → dibujo",
  first: "Letra inicial",
  vowel: "Vocal que falta",
};

/** Stable identity for a language never played: no fresh object per render. */
const NO_PROGRESS: LanguageProgress = Object.freeze({});

/**
 * Owns the round and switches between the start, round and summary screens.
 * The round is built on the client, when the player asks for it: shuffling
 * during render would not match the cached HTML. Progress lives only in this
 * browser (spec §7.4).
 */
export function WordJumpGame({ pack }: WordJumpGameProps) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [round, setRound] = useState<RoundState | null>(null);
  const { progress, storageAvailable } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const lang = pack.language.isoCode;
  const slug = pack.language.slug;
  const seen = progress.languages[slug] ?? NO_PROGRESS;

  const context: RoundContext | null = useMemo(
    () =>
      theme ? { theme, playable: pack.themes, rules: pack.language } : null,
    [theme, pack.themes, pack.language],
  );

  const sourceTitles = useMemo(
    () => new Map(pack.sources.map((source) => [source.id, source.title])),
    [pack.sources],
  );

  // Only ever called from a click: the seed is taken when the player asks for
  // a round, never during render.
  const start = useCallback(
    (chosen: Theme) => {
      const seed = Date.now();
      setTheme(chosen);
      setRound(
        createRound(
          buildRound(chosen.items, seen, seed),
          { theme: chosen, playable: pack.themes, rules: pack.language },
          seed,
        ),
      );
    },
    [pack.themes, pack.language, seen],
  );

  const answer = useCallback(
    (index: number) =>
      setRound((current) =>
        current ? answerQuestion(current, index) : current,
      ),
    [],
  );

  const next = useCallback(() => {
    if (!round || !context) return;
    const after = nextQuestion(round, context);
    // Written once, when the round ends (spec §7.4).
    if (after.status === "finished") saveRound(slug, roundOutcomes(after));
    setRound(after);
  }, [round, context, slug]);

  if (!theme || !round || !context) {
    return (
      <section aria-labelledby="temas" className="mt-8">
        <h2 id="temas" className="text-xl font-bold">
          Elige un tema
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {pack.themes.map((item) => {
            const known = item.items.filter(
              (each) => (seen[each.id]?.seen ?? 0) > 0,
            ).length;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => start(item)}
                  className={`${buttonClass} flex w-full items-center gap-3 bg-[#FBEFD2] text-left text-[#241D14] hover:bg-[#F6E3B4]`}
                >
                  <span aria-hidden="true" className="text-2xl">
                    {item.icon}
                  </span>
                  <span>
                    {item.name}
                    {item.nameNative ? (
                      <span lang={lang} className="block text-sm font-normal">
                        {item.nameNative}
                      </span>
                    ) : null}
                    <span className="block text-sm font-normal">
                      {MODE_NAMES[item.mode]} · Palabras vistas: {known} de{" "}
                      {item.items.length}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {storageAvailable ? null : (
          // Said once, plainly: the game still works.
          <p className="mt-4 text-sm text-[#4A4130]">
            Tu navegador no nos deja guardar el progreso, así que no vamos a
            recordar tus rondas. El juego funciona igual.
          </p>
        )}
      </section>
    );
  }

  if (round.status === "finished") {
    const outcomes = roundOutcomes(round);
    const firstTry = outcomes.filter((outcome) => outcome.correctFirstTry);
    const toReview = round.items.filter((item) =>
      outcomes.some(
        (outcome) => outcome.itemId === item.id && !outcome.correctFirstTry,
      ),
    );

    return (
      <section aria-labelledby="resumen" className="mt-8">
        <h2 id="resumen" className="text-xl font-bold">
          ¡Ronda terminada!
        </h2>
        <p className="mt-3">
          Acertaste a la primera {firstTry.length} de {round.total}.
        </p>
        {toReview.length > 0 ? (
          <>
            <h3 className="mt-6 font-bold">Palabras para repasar</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {toReview.map((item) => (
                <li key={item.id}>
                  <span lang={lang} className="font-bold">
                    {item.word}
                  </span>{" "}
                  — {item.translation}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => start(theme)}
            className={`${buttonClass} bg-[#E4572E] text-white hover:bg-[#C7431C]`}
          >
            Otra ronda
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme(null);
              setRound(null);
            }}
            className={`${buttonClass} border-2 border-[#241D14] text-[#241D14]`}
          >
            Elegir otro tema
          </button>
        </div>
      </section>
    );
  }

  return (
    <RoundView
      round={round}
      theme={theme}
      lang={lang}
      sourceTitles={sourceTitles}
      onAnswer={answer}
      onNext={next}
    />
  );
}
