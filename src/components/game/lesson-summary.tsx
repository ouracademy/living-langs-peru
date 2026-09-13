"use client";

import Link from "next/link";

import { toSentenceText } from "@/lib/game/sentence";
import type { Item } from "@/lib/game/types";

type LessonSummaryProps = {
  answered: number;
  total: number;
  hearts: number;
  /** Words missed at least once. The part of the screen that teaches. */
  missed: Item[];
  failed: boolean;
  languageCode: string;
  /** Slug of the language being played, for the dictionary links. */
  language: string;
  onRestart: () => void;
};

export function LessonSummary({
  answered,
  total,
  hearts,
  missed,
  failed,
  languageCode,
  language,
  onRestart,
}: LessonSummaryProps) {
  return (
    <section>
      <h2 className="mt-8 text-2xl font-bold">
        {failed ? "Se acabaron las vidas" : "Lección completada"}
      </h2>

      <p className="mt-2 text-[#4A4130]">
        Acertaste {answered} de {total}.{" "}
        {failed
          ? "Puedes intentarlo otra vez cuando quieras: no hay nada que esperar."
          : `Te quedaron ${hearts} ${hearts === 1 ? "vida" : "vidas"}.`}
      </p>

      {missed.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold">Palabras para repasar</h3>
          <ul className="mt-2 flex flex-col gap-4">
            {missed.map((item) => (
              <li key={item.id}>
                <p>
                  <strong
                    lang={languageCode || undefined}
                    className="font-bold"
                  >
                    {item.answer}
                  </strong>{" "}
                  — {item.answerTranslation}{" "}
                  <Link
                    // The dictionary already resolves ?palabra; reuse it.
                    href={`/diccionario/${language}?palabra=${item.id.split(":")[0]}`}
                    className="text-sm underline"
                  >
                    ver en el diccionario
                  </Link>
                </p>
                <p
                  lang={languageCode || undefined}
                  className="text-sm text-[#241D14]"
                >
                  {toSentenceText(item.tokens, item.answer)}
                </p>
                <p className="text-sm text-[#4A4130]">«{item.prompt}»</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onRestart}
        className="mt-8 rounded-2xl bg-[#E4572E] px-6 py-3 font-bold text-white"
      >
        Otra lección
      </button>
    </section>
  );
}
