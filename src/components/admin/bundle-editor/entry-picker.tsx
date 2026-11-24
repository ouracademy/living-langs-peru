import { useId, useState } from "react";

import { filterEntries, NO_FILTER } from "@/lib/language-bundles/edit-bundle";
import type { LanguageBundle } from "@/lib/language-bundles/types";

import { checkboxLabel, input, secondaryButton } from "../pack-admin/styles";

const PAGE = 30;

type EntryPickerProps = {
  bundle: LanguageBundle;
  legend: string;
  selected: string[];
  lang: string;
  onToggle: (entryId: string, included: boolean) => void;
};

/** Choose a theme's words: a search and a list of checkboxes. */
export function EntryPicker({
  bundle,
  legend,
  selected,
  lang,
  onToggle,
}: EntryPickerProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const chosen = new Set(selected);
  const matches = filterEntries(bundle, { ...NO_FILTER, query });

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-sm font-bold">
        {legend} ({selected.length} elegidas)
      </legend>
      <label htmlFor={searchId} className="text-sm">
        Buscar entre las palabras
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setLimit(PAGE);
        }}
        className={input}
      />
      <ul className="flex max-h-80 flex-col overflow-y-auto rounded-xl bg-white px-3">
        {matches.slice(0, limit).map((entry) => (
          <li key={entry.id}>
            <label className={checkboxLabel}>
              <input
                type="checkbox"
                checked={chosen.has(entry.id)}
                onChange={(event) => onToggle(entry.id, event.target.checked)}
                className="size-5"
              />
              <span aria-hidden="true">{entry.emoji ?? "·"}</span>
              <span lang={lang || undefined}>{entry.word}</span>
              <span className="font-normal text-[#4A4130]">
                {entry.translations[0]}
                {entry.verified ? "" : " · sin verificar"}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {matches.length > limit ? (
        <button
          type="button"
          onClick={() => setLimit(limit + PAGE)}
          className={`${secondaryButton} self-start`}
        >
          Mostrar {Math.min(PAGE, matches.length - limit)} más
        </button>
      ) : null}
    </fieldset>
  );
}
