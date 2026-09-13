"use client";

type OptionButtonProps = {
  word: string;
  /** 1-based, shown as the keyboard shortcut. */
  position: number;
  languageCode: string;
  disabled?: boolean;
  onSelect: (word: string) => void;
};

export function OptionButton({
  word,
  position,
  languageCode,
  disabled,
  onSelect,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-keyshortcuts={String(position)}
      onClick={() => onSelect(word)}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left font-bold shadow-[0_3px_0_rgba(36,29,20,0.06)] enabled:hover:bg-[#FBEFD2] disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-sm font-normal"
      >
        {position}
      </span>
      {/* The word itself is Asháninka; the surrounding chrome is Spanish. */}
      <span lang={languageCode || undefined} className="break-words">
        {word}
      </span>
    </button>
  );
}
