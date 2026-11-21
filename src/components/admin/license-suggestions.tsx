import { LICENSE_SUGGESTIONS } from "@/lib/admin/license-suggestions";

type LicenseSuggestionsProps = {
  current: string;
  disabled: boolean;
  onPick: (license: string) => void;
};

/** One-tap licenses that fill the «Licencia» field (UI-6). */
export function LicenseSuggestions({
  current,
  disabled,
  onPick,
}: LicenseSuggestionsProps) {
  return (
    <div
      role="group"
      aria-label="Licencias frecuentes"
      className="mt-1 flex flex-wrap gap-2"
    >
      {LICENSE_SUGGESTIONS.map((license) => (
        <button
          key={license}
          type="button"
          disabled={disabled}
          aria-pressed={current.trim() === license}
          onClick={() => onPick(license)}
          className="min-h-11 cursor-pointer rounded-full border-2 border-[#E8DCC4] bg-[#FFF7E8] px-3 text-sm font-bold text-[#241D14] hover:border-[#241D14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C] disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-[#241D14] aria-pressed:bg-[#F6E3B4]"
        >
          {license}
        </button>
      ))}
    </div>
  );
}
