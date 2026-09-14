import { BLANK_LABEL, toSentenceParts } from "@/lib/game/sentence";

type BlankedSentenceProps = {
  tokens: (string | null)[];
  /** ISO 639-3 code, so a screen reader does not read Asháninka as Spanish. */
  languageCode: string;
  /** Once answered, the word goes into the gap instead of the placeholder. */
  filledWith?: string;
};

export function BlankedSentence({
  tokens,
  languageCode,
  filledWith,
}: BlankedSentenceProps) {
  return (
    <p
      lang={languageCode || undefined}
      className="mt-6 text-2xl leading-relaxed font-bold"
    >
      {toSentenceParts(tokens).map((part, index) => (
        <span key={index}>
          {part.spaceBefore ? " " : ""}
          {part.token ?? (
            <span className="inline-flex min-w-[6ch] justify-center border-b-4 border-[#4A4130] align-baseline">
              {filledWith ?? (
                // The dash is decorative; the label is what gets announced.
                <>
                  <span aria-hidden="true">&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  <span className="sr-only">{BLANK_LABEL}</span>
                </>
              )}
            </span>
          )}
        </span>
      ))}
    </p>
  );
}
