import {
  GAP,
  type Question,
  type QuestionMode,
} from "@/lib/word-jump/questions";

export const buttonClass =
  "min-h-11 min-w-11 rounded-full px-6 py-3 text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241D14]";

export const QUESTION_TITLES: Record<QuestionMode, string> = {
  pic2word: "¿Cómo se dice?",
  word2pic: "¿Qué dibujo es?",
  first: "¿Con qué letra empieza?",
  vowel: "¿Qué vocal falta?",
};

/**
 * A word with a gap: the gap is shown as a line and read as «hueco», so a
 * screen reader does not spell out a full-width low line.
 */
export function WordWithGap({ text, lang }: { text: string; lang: string }) {
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

/** The clue of the challenge: picture, meaning and/or word (spec §5.2). */
export function Prompt({
  question,
  lang,
  showMeaning = true,
}: {
  question: Question;
  lang: string;
  showMeaning?: boolean;
}) {
  const { emoji, label, text } = question.prompt;

  return (
    <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      {emoji ? (
        // Named by the translation, not by the Unicode name (spec §7.3).
        <span role="img" aria-label={label} className="text-4xl">
          {emoji}
        </span>
      ) : null}
      {label && (showMeaning || !emoji) ? (
        <span className="text-base text-[#4A4130]">({label})</span>
      ) : null}
      {text ? (
        <span className="text-2xl font-bold tracking-wide">
          <WordWithGap text={text} lang={lang} />
        </span>
      ) : null}
    </span>
  );
}
