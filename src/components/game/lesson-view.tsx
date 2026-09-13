"use client";

import type { Item } from "@/lib/game/types";

import { BlankedSentence } from "./blanked-sentence";
import { OptionButton } from "./option-button";

type LessonViewProps = {
  item: Item;
  /** Already ordered for this item; the view does not shuffle. */
  options: string[];
  languageCode: string;
  answered?: boolean;
  onSelect: (word: string) => void;
};

export function LessonView({
  item,
  options,
  languageCode,
  answered,
  onSelect,
}: LessonViewProps) {
  return (
    <section>
      <h2 className="mt-8 text-sm font-bold tracking-wide text-[#4A4130] uppercase">
        Completa la oración
      </h2>

      <p className="mt-2 text-lg text-[#241D14]">«{item.prompt}»</p>

      <BlankedSentence
        tokens={item.tokens}
        languageCode={languageCode}
        filledWith={answered ? item.answer : undefined}
      />

      <div className="mt-8 flex flex-col gap-3">
        {options.map((word, index) => (
          <OptionButton
            key={word}
            word={word}
            position={index + 1}
            languageCode={languageCode}
            disabled={answered}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
