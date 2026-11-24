import { useId, useState } from "react";

import {
  addEntry,
  emptyEntryFields,
  type EntryFilter,
  filterEntries,
} from "@/lib/language-bundles/edit-bundle";
import type { LanguageBundle } from "@/lib/language-bundles/types";

import {
  checkboxLabel,
  input,
  primaryButton,
  secondaryButton,
} from "../bundle-admin/styles";
import { BulkVerify } from "./bulk-verify";
import { EntryForm } from "./entry-form";
import { EntryRow } from "./entry-row";
import type { EditorChange } from "./types";

/** Rows shown at once; «Mostrar más» adds this many. */
export const ENTRY_PAGE = 50;

type EntriesPanelProps = {
  bundle: LanguageBundle;
  lang: string;
  onChange: EditorChange;
  filter: EntryFilter;
  onFilter: (filter: EntryFilter) => void;
  limit: number;
  onLimit: (limit: number) => void;
};

const FILTERS: { key: keyof Omit<EntryFilter, "query">; label: string }[] = [
  { key: "unverified", label: "Solo sin verificar" },
  { key: "noEmoji", label: "Solo sin dibujo" },
  { key: "outsideAlphabet", label: "Solo con letras fuera del alfabeto" },
];

function FilterBar({
  filter,
  onFilter,
}: Pick<EntriesPanelProps, "filter" | "onFilter">) {
  const searchId = useId();
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={searchId} className="text-sm font-bold">
        Buscar palabra o traducción
      </label>
      <input
        id={searchId}
        type="search"
        value={filter.query}
        onChange={(event) => onFilter({ ...filter, query: event.target.value })}
        className={input}
      />
      <div className="flex flex-wrap gap-x-5">
        {FILTERS.map(({ key, label }) => (
          <label key={key} className={checkboxLabel}>
            <input
              type="checkbox"
              checked={filter[key]}
              onChange={(event) =>
                onFilter({ ...filter, [key]: event.target.checked })
              }
              className="size-5"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function AddEntry({
  bundle,
  lang,
  onChange,
}: Pick<EntriesPanelProps, "bundle" | "lang" | "onChange">) {
  const [adding, setAdding] = useState(false);
  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className={primaryButton}
      >
        Agregar una palabra
      </button>
    );
  }
  return (
    <section aria-label="Palabra nueva">
      <h3 className="font-bold">Palabra nueva</h3>
      <EntryForm
        bundle={bundle}
        initial={emptyEntryFields(bundle.sources[0]?.id)}
        lang={lang}
        submitLabel="Agregar"
        onSubmit={(data) => {
          const added = addEntry(bundle, data);
          onChange(added.bundle, `«${data.word}» agregada.`);
          setAdding(false);
        }}
        onCancel={() => setAdding(false)}
      />
    </section>
  );
}

/** «Palabras»: the one list of words the dictionary and both games use. */
export function EntriesPanel({
  bundle,
  lang,
  onChange,
  filter,
  onFilter,
  limit,
  onLimit,
}: EntriesPanelProps) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const visible = filterEntries(bundle, filter);
  const shown = visible.slice(0, limit);
  const visibleIds = visible.map((entry) => entry.id);
  // Only what the list shows can be acted on: a removed word drops out.
  const selectedIds = visibleIds.filter((id) => selected.has(id));

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <AddEntry bundle={bundle} lang={lang} onChange={onChange} />
      <FilterBar
        filter={filter}
        onFilter={(next) => {
          onFilter(next);
          onLimit(ENTRY_PAGE);
          setSelected(new Set());
        }}
      />
      <p className="text-sm font-bold" aria-live="polite">
        {visible.length} de {bundle.entries.length} palabras
        {selectedIds.length > 0 ? ` · ${selectedIds.length} seleccionadas` : ""}
      </p>
      <BulkVerify
        bundle={bundle}
        visibleIds={visibleIds}
        selectedIds={selectedIds}
        onSelect={(ids) => setSelected(new Set(ids))}
        onChange={onChange}
      />
      <ul className="flex flex-col gap-3">
        {shown.map((entry) => (
          <EntryRow
            key={entry.id}
            bundle={bundle}
            entry={entry}
            lang={lang}
            selected={selected.has(entry.id)}
            onSelect={(checked) => toggle(entry.id, checked)}
            onChange={onChange}
          />
        ))}
      </ul>
      {visible.length > shown.length ? (
        <button
          type="button"
          onClick={() => onLimit(limit + ENTRY_PAGE)}
          className={`${secondaryButton} self-start`}
        >
          Mostrar {Math.min(ENTRY_PAGE, visible.length - shown.length)} más
        </button>
      ) : null}
    </div>
  );
}
