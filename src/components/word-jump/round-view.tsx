"use client";

import { useEffect, useRef } from "react";

import type { Theme } from "@/lib/language-packs/types";
import {
  GAP,
  type Question,
  type QuestionMode,
} from "@/lib/word-jump/questions";
import type { RoundState } from "@/lib/word-jump/round";

import { JumpCanvas } from "./jump-canvas";

export const buttonClass =
  "min-h-11 min-w-11 rounded-full px-6 py-3 text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241D14]";

const QUESTION_TITLES: Record<QuestionMode, string> = {
  pic2word: "¿Cómo se dice?",
  word2pic: "¿Qué dibujo es?",
  first: "¿Con qué letra empieza?",
  vowel: "¿Qué vocal falta?",
};

type RoundViewProps = {
  round: RoundState;
  theme: Theme;
  /** ISO 639-3 of the pack, for every text in the language (spec §7.3). */
  lang: string;
  sourceTitles: Map<string, string>;
  onAnswer: (index: number) => void;
  onNext: () => void;
};

/**
 * A word with a gap: the gap is shown as a line and read as «hueco», so a
 * screen reader does not spell out a full-width low line.
 */
function WordWithGap({ text, lang }: { text: string; lang: string }) {
  const parts = text.split(GAP);

  return (
    <span lang={lang}>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? (
            <>
              <span aria-hidden="true">{GAP}</span>
              <span className="sr-only">(hueco)</span>
            </>
          ) : null}
          {part}
        </span>
      ))}
    </span>
  );
}

function Prompt({ question, lang }: { question: Question; lang: string }) {
  const { emoji, label, text } = question.prompt;

  return (
    <div className="mt-6 flex flex-col items-center gap-2 text-center">
      {emoji ? (
        // Named by the translation, not by the Unicode name (spec §7.3).
        <span role="img" aria-label={label} className="text-6xl">
          {emoji}
        </span>
      ) : label ? (
        <span className="text-lg">{label}</span>
      ) : null}
      {text ? (
        <span className="text-3xl font-bold tracking-wide">
          <WordWithGap text={text} lang={lang} />
        </span>
      ) : null}
    </div>
  );
}

/** The right answer, as the feedback shows it. */
function AnswerText({ question, lang }: { question: Question; lang: string }) {
  const answer = question.options[question.answerIndex];

  if (question.optionsInLanguage) {
    return (
      <span lang={lang} className="font-bold">
        {answer.text}
      </span>
    );
  }

  return (
    <span role="img" aria-label={answer.label}>
      {answer.text}
    </span>
  );
}

/**
 * One question and its feedback. Playable with the keyboard alone (AC-SP4-5):
 * 1, 2 and 3 answer, focus goes to «Seguir» after answering and back to the
 * question after it. The canvas is decorative; every answer is a real button.
 */
export function RoundView({
  round,
  theme,
  lang,
  sourceTitles,
  onAnswer,
  onNext,
}: RoundViewProps) {
  const questionRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const question = round.question;
  const feedback = round.feedback;
  const optionCount = question?.options.length ?? 0;

  // Focus follows the round: «Seguir» after an answer, the question otherwise.
  useEffect(() => {
    if (feedback) nextRef.current?.focus();
    else questionRef.current?.focus();
  }, [question, feedback]);

  // Keys 1, 2, 3 answer while a question is open (aria-keyshortcuts below).
  useEffect(() => {
    if (feedback || optionCount === 0) return;

    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= optionCount) {
        return;
      }
      event.preventDefault();
      onAnswer(index);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, optionCount, onAnswer]);

  if (!question) return null;

  const done = round.cleared.length + round.revealed.length;
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

      <Prompt question={question} lang={lang} />
      <h3
        ref={questionRef}
        tabIndex={-1}
        className="mt-2 text-center font-bold focus-visible:outline-2 focus-visible:outline-[#241D14]"
      >
        {QUESTION_TITLES[question.mode]}
      </h3>

      <div className="mt-4">
        <JumpCanvas
          platforms={question.options.length}
          target={feedback ? feedback.selectedIndex : null}
          outcome={feedback ? (feedback.correct ? "land" : "bounce") : null}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {question.options.map((option, index) => {
          const isAnswer = feedback !== null && index === question.answerIndex;
          const isWrongPick =
            feedback !== null &&
            !feedback.correct &&
            index === feedback.selectedIndex;

          return (
            <button
              key={option.itemId ?? `${index}:${option.text}`}
              type="button"
              lang={question.optionsInLanguage ? lang : undefined}
              aria-label={option.label}
              aria-keyshortcuts={String(index + 1)}
              disabled={feedback !== null}
              onClick={() => onAnswer(index)}
              className={`${buttonClass} ${
                question.optionsInLanguage ? "" : "text-3xl"
              } ${
                isAnswer
                  ? "border-4 border-[#1B98A0] bg-[#241D14] text-white"
                  : isWrongPick
                    ? "border-4 border-dashed border-[#C7431C] bg-[#4A4130] text-white"
                    : "bg-[#241D14] text-white hover:bg-[#4A4130]"
              } disabled:cursor-default`}
            >
              {option.text}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-sm text-[#4A4130]">
        También puedes responder con las teclas 1, 2 y 3.
      </p>

      <div role="status" className="mt-6">
        {feedback ? (
          <div className="rounded-[20px] bg-[#FBEFD2] px-6 py-5">
            <p className="text-lg font-bold">
              {feedback.correct ? "✓ ¡Correcto!" : "✗ No es esa."}
            </p>
            {feedback.correct ? null : (
              <p className="mt-2">
                La respuesta es{" "}
                <AnswerText question={feedback.question} lang={lang} />.
              </p>
            )}
            <p className="mt-2">
              <span lang={lang} className="font-bold">
                {feedback.item.word}
              </span>
              : {feedback.item.translation}.
            </p>
            {feedback.item.verified ? null : (
              // Only reachable from «Probar» in /admin/juego: the public game
              // filters unverified items out before they get here (decision #4).
              <p className="mt-1 text-sm font-bold text-[#C7431C]">
                ⚠ Sin verificar
              </p>
            )}
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
              ref={nextRef}
              type="button"
              onClick={onNext}
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
