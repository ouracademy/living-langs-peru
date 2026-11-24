import { useState } from "react";

import {
  type EntryData,
  entryToFields,
  removeEntry,
  themesWithEntry,
  updateEntry,
} from "@/lib/language-bundles/edit-bundle";
import { entryAnchor } from "@/lib/language-bundles/editor-view";
import type { BundleEntry, LanguageBundle } from "@/lib/language-bundles/types";

import {
  checkboxLabel,
  dangerButton,
  secondaryButton,
} from "../pack-admin/styles";
import { EntryForm } from "./entry-form";
import type { EditorChange } from "./types";

type EntryRowProps = {
  bundle: LanguageBundle;
  entry: BundleEntry;
  lang: string;
  onChange: EditorChange;
};

function RemoveConfirm({
  bundle,
  entry,
  onChange,
  onCancel,
}: {
  bundle: LanguageBundle;
  entry: BundleEntry;
  onChange: EditorChange;
  onCancel: () => void;
}) {
  const themes = themesWithEntry(bundle, entry.id);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white p-3">
      <p className="text-sm">
        ¿Quitar «{entry.word}»?
        {themes.length > 0
          ? ` También sale de: ${themes.map((name) => `«${name}»`).join(", ")}.`
          : ""}
      </p>
      <button
        type="button"
        onClick={() => {
          const result = removeEntry(bundle, entry.id);
          if (result.ok) onChange(result.bundle, `«${entry.word}» quitada.`);
          else onChange(null, result.reason);
          onCancel();
        }}
        className={dangerButton}
      >
        Sí, quitar
      </button>
      <button
        type="button"
        autoFocus
        onClick={onCancel}
        className={secondaryButton}
      >
        Cancelar
      </button>
    </div>
  );
}

/**
 * One word: what the dictionary shows, «Verificada», and «Editar» or «Quitar»
 * in place. The row is the anchor the error list links to.
 */
export function EntryRow({ bundle, entry, lang, onChange }: EntryRowProps) {
  const [mode, setMode] = useState<"view" | "edit" | "remove">("view");
  const source = bundle.sources.find((each) => each.id === entry.sourceId);

  return (
    <li
      id={entryAnchor(entry.id)}
      tabIndex={-1}
      className="rounded-[20px] border-2 border-[#E8DCC4] bg-white p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span aria-hidden="true" className="w-8 text-2xl">
          {entry.emoji ?? "·"}
        </span>
        <span className="min-w-0 flex-1">
          <span lang={lang || undefined} className="font-bold break-words">
            {entry.word}
          </span>
          <span className="block text-sm break-words text-[#4A4130]">
            {entry.translations[0]}
            {source ? ` · ${source.title}` : ""}
          </span>
        </span>
        <label className={checkboxLabel}>
          <input
            type="checkbox"
            checked={entry.verified}
            onChange={(event) =>
              onChange(
                updateEntry(bundle, entry.id, {
                  verified: event.target.checked,
                }),
                event.target.checked
                  ? `«${entry.word}» marcada como verificada.`
                  : `«${entry.word}» ya no está verificada.`,
              )
            }
            className="size-5"
          />
          Verificada
        </label>
        <button
          aria-label={`Editar «${entry.word}»`}
          type="button"
          aria-expanded={mode === "edit"}
          onClick={() => setMode(mode === "edit" ? "view" : "edit")}
          className={secondaryButton}
        >
          Editar
        </button>
        <button
          aria-label={`Quitar «${entry.word}»`}
          type="button"
          onClick={() => setMode("remove")}
          className={dangerButton}
        >
          Quitar
        </button>
      </div>
      {mode === "edit" ? (
        <EntryForm
          bundle={bundle}
          entry={entry}
          initial={entryToFields(entry)}
          lang={lang}
          submitLabel="Guardar"
          onSubmit={(data: EntryData) => {
            onChange(
              updateEntry(bundle, entry.id, data),
              `«${data.word}» guardada.`,
            );
            setMode("view");
          }}
          onCancel={() => setMode("view")}
        />
      ) : null}
      {mode === "remove" ? (
        <RemoveConfirm
          bundle={bundle}
          entry={entry}
          onChange={onChange}
          onCancel={() => setMode("view")}
        />
      ) : null}
    </li>
  );
}
