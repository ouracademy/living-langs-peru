"use client";

import { LESSON_SIZE } from "@/lib/game/constants";

type LessonStartProps = {
  /** Items the lesson will ask for: the pool, capped at a lesson. */
  lessonLength: number;
  /** From the browser. Zero during the server render, by design. */
  lessonsCompleted: number;
  storageAvailable: boolean;
  onStart: () => void;
};

export function LessonStart({
  lessonLength,
  lessonsCompleted,
  storageAvailable,
  onStart,
}: LessonStartProps) {
  return (
    <section>
      <p className="mt-4 max-w-[60ch] text-[#4A4130]">
        Te mostramos una oración con un hueco y su traducción al español. Elige
        la palabra que falta entre tres opciones. Son{" "}
        {Math.min(lessonLength, LESSON_SIZE)} preguntas y tienes tres vidas.
      </p>

      {lessonsCompleted > 0 && (
        <p className="mt-4 font-bold">
          {lessonsCompleted === 1
            ? "Completaste 1 lección"
            : `Completaste ${lessonsCompleted} lecciones`}
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        className="mt-6 rounded-2xl bg-[#E4572E] px-6 py-3 text-lg font-bold text-white"
      >
        Empezar lección
      </button>

      {!storageAvailable && (
        // Said once, plainly, and never again: the game still works.
        <p className="mt-4 text-sm text-[#4A4130]">
          Tu navegador no nos deja guardar el progreso, así que no vamos a
          recordar tus lecciones. El juego funciona igual.
        </p>
      )}
    </section>
  );
}
