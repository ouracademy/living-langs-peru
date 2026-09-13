"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";

import type { Source } from "@/lib/dictionary";
import type { Item } from "@/lib/game/types";

type FeedbackPanelProps = {
  item: Item;
  correct: boolean;
  languageCode: string;
  /** The work the sentence comes from, so every item is attributable. */
  source?: Source;
  /** The whole sentence as the source wrote it, blank filled in. */
  sentence: string;
  onContinue: () => void;
};

export function FeedbackPanel({
  item,
  correct,
  languageCode,
  source,
  sentence,
  onContinue,
}: FeedbackPanelProps) {
  const continueRef = useRef<HTMLButtonElement>(null);

  // Without this, a keyboard user is left with focus on a button that just
  // became disabled and has to hunt for the way forward after every answer.
  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  return (
    <div
      // Polite: the result is expected, so it should not interrupt.
      role="status"
      className={`mt-8 rounded-2xl border p-5 ${
        correct
          ? "border-[#1B98A0] bg-[#EAF7F7]"
          : "border-[#E4572E] bg-[#FFF7E8]"
      }`}
    >
      <p className="flex items-center gap-2 font-bold">
        {/* Never colour alone: the icon and the word carry the result too. */}
        {correct ? (
          <Check aria-hidden="true" className="h-5 w-5 text-[#1B98A0]" />
        ) : (
          <X aria-hidden="true" className="h-5 w-5 text-[#E4572E]" />
        )}
        {correct ? "Correcto" : "Incorrecto"}
      </p>

      <p className="mt-3">
        <strong lang={languageCode || undefined} className="font-bold">
          {item.answer}
        </strong>{" "}
        — {item.answerTranslation}
      </p>

      <p lang={languageCode || undefined} className="mt-2 text-[#241D14]">
        {sentence}
      </p>
      <p className="mt-1 text-sm text-[#4A4130]">«{item.prompt}»</p>

      {source && (
        <p className="mt-3 text-xs text-[#4A4130]">
          Fuente:{" "}
          <a href={source.url} rel="noreferrer noopener" className="underline">
            {source.title}
          </a>
          , {source.publisher}, {source.year}.
        </p>
      )}

      <button
        ref={continueRef}
        type="button"
        onClick={onContinue}
        className="mt-4 rounded-2xl bg-[#241D14] px-5 py-2.5 font-bold text-white"
      >
        Continuar
      </button>
    </div>
  );
}
