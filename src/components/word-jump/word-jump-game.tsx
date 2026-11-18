"use client";

import { useCallback, useMemo, useState } from "react";

import type { Theme } from "@/lib/language-packs/types";
import type { PublicPack } from "@/lib/word-jump/game-state";
import {
  type RoundContext,
  type RoundState,
  answerQuestion,
  buildRound,
  createRound,
  nextQuestion,
  roundOutcomes,
} from "@/lib/word-jump/round";

import { JumpCanvas } from "./jump-canvas";

type WordJumpGameProps = {
  /** Already filtered by `playableThemes` on the server. */
  pack: PublicPack;
};

const buttonClass =
  "min-h-11 min-w-11 rounded-full px-6 py-3 text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241D14]";

/**
 * Owns the round and switches between the start, round and summary screens.
 * The round is built on the client, when the player asks for it: shuffling
 * during render would not match the cached HTML.
 */
export function WordJumpGame({ pack }: WordJumpGameProps) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [round, setRound] = useState<RoundState | null>(null);
  const lang = pack.language.isoCode;

  const context: RoundContext | null = useMemo(
    () => (theme ? { theme, playable: pack.themes } : null),
    [theme, pack.themes],
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
          buildRound(chosen.items, {}, seed),
          { theme: chosen, playable: pack.themes },
          seed,
        ),
      );
    },
    [pack.themes],
  );

  if (!theme || !round || !context) {
    return (
      <section aria-labelledby="temas" className="mt-8">
        <h2 id="temas" className="text-xl font-bold">
          Elige un tema
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {pack.themes.map((item) => (
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
                </span>
              </button>
            </li>
          ))}
        </ul>
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

  const question = round.question;
  const feedback = round.feedback;
  if (!question) return null;
  const done = round.cleared.length + round.revealed.length;
  const answer = feedback?.question.options[feedback.question.answerIndex];
  const source = feedback?.item.sourceId
    ? sourceTitles.get(feedback.item.sourceId)
    : undefined;

  return (
    <section aria-labelledby="ronda" className="mt-8">
      <h2 id="ronda" className="sr-only">
        Ronda de {theme.name}
      </h2>
      <div
        role="progressbar"
        aria-label="Progreso de la ronda"
        aria-valuemin={0}
        aria-valuemax={round.total}
        aria-valuenow={done}
        className="h-3 overflow-hidden rounded-full bg-[#FBEFD2]"
      >
        <div
          className="h-full bg-[#1B98A0]"
          style={{ width: `${(done / round.total) * 100}%` }}
        />
      </div>

      <p className="mt-6 text-center">
        <span
          role="img"
          aria-label={question.prompt.label}
          className="text-6xl"
        >
          {question.prompt.emoji}
        </span>
      </p>
      <p className="mt-2 text-center font-bold">¿Cómo se dice?</p>

      <div className="mt-4">
        <JumpCanvas
          platforms={question.options.length}
          target={feedback ? feedback.selectedIndex : null}
          outcome={feedback ? (feedback.correct ? "land" : "bounce") : null}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {question.options.map((option, index) => (
          <button
            key={option.itemId}
            type="button"
            lang={lang}
            disabled={feedback !== null}
            onClick={() => setRound(answerQuestion(round, index))}
            className={`${buttonClass} bg-[#241D14] text-white hover:bg-[#4A4130] disabled:opacity-60`}
          >
            {option.text}
          </button>
        ))}
      </div>

      <div role="status" className="mt-6">
        {feedback ? (
          <div className="rounded-[20px] bg-[#FBEFD2] px-6 py-5">
            <p className="text-lg font-bold">
              {feedback.correct ? "✓ ¡Correcto!" : "✗ No es esa."}
            </p>
            <p className="mt-2">
              {feedback.correct ? "" : "La respuesta es "}
              <span lang={lang} className="font-bold">
                {answer?.text}
              </span>
              : {feedback.item.translation}.
            </p>
            {source ? (
              <p className="mt-1 text-sm text-[#4A4130]">
                Fuente: {source}
                {feedback.item.sourceRef ? `, ${feedback.item.sourceRef}` : ""}
              </p>
            ) : null}
            {!feedback.correct && !feedback.revealed ? (
              <p className="mt-1 text-sm text-[#4A4130]">
                Esta palabra volverá más adelante en la ronda.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setRound(nextQuestion(round, context))}
              className={`${buttonClass} mt-4 bg-[#E4572E] text-white hover:bg-[#C7431C]`}
            >
              Seguir
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
