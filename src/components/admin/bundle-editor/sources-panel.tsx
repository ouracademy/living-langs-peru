import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";

import {
  addSource,
  checkSourceFields,
  EMPTY_SOURCE_FIELDS,
  removeSource,
  type SourceFieldErrors,
  type SourceFields,
  sourceToFields,
  sourceUsage,
  updateSource,
} from "@/lib/language-bundles/edit-bundle";
import { SOURCES_ANCHOR } from "@/lib/language-bundles/editor-view";
import type {
  BundleSource,
  LanguageBundle,
} from "@/lib/language-bundles/types";

import {
  dangerButton,
  primaryButton,
  secondaryButton,
} from "../bundle-admin/styles";
import { SelectField, TextField } from "./fields";
import { SOURCE_KIND_LABELS } from "./labels";
import type { EditorChange } from "./types";

type SourcesPanelProps = { bundle: LanguageBundle; onChange: EditorChange };

const KINDS = Object.entries(SOURCE_KIND_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function SourceForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: SourceFields;
  submitLabel: string;
  onSubmit: (fields: SourceFields) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<SourceFieldErrors>({});
  const set = (patch: Partial<SourceFields>) =>
    setFields((current) => ({ ...current, ...patch }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = checkSourceFields(fields);
    if (Object.keys(found).length > 0) {
      const form = event.currentTarget;
      flushSync(() => setErrors(found));
      form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    onSubmit(fields);
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      className="mt-3 grid gap-3 rounded-[20px] bg-[#FBEFD2] p-4 sm:grid-cols-2"
    >
      <TextField
        label="Título"
        value={fields.title}
        error={errors.title}
        onChange={(title) => set({ title })}
      />
      <SelectField
        label="Tipo"
        value={fields.kind}
        options={KINDS}
        onChange={(kind) => set({ kind: kind as SourceFields["kind"] })}
      />
      <TextField
        label="Editorial o institución"
        value={fields.publisher}
        onChange={(publisher) => set({ publisher })}
      />
      <TextField
        label="Año"
        inputMode="numeric"
        value={fields.year}
        error={errors.year}
        onChange={(year) => set({ year })}
      />
      <TextField
        label="Autores"
        hint="Separados por comas."
        value={fields.authors}
        onChange={(authors) => set({ authors })}
      />
      <TextField
        label="Enlace"
        inputMode="url"
        value={fields.url}
        error={errors.url}
        onChange={(url) => set({ url })}
      />
      <TextField
        label="Licencia o permiso"
        value={fields.license}
        onChange={(license) => set({ license })}
      />
      <TextField
        label="Nota"
        multiline
        value={fields.note}
        onChange={(note) => set({ note })}
      />
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" className={primaryButton}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function usageText(bundle: LanguageBundle, id: string): string {
  const usage = sourceUsage(bundle, id);
  const parts = [
    `${usage.entries} palabra${usage.entries === 1 ? "" : "s"}`,
    usage.examples > 0 ? `${usage.examples} ejemplos` : "",
    usage.alphabet ? "el alfabeto" : "",
  ].filter(Boolean);
  return `La citan: ${parts.join(", ")}.`;
}

function SourceItem({
  bundle,
  source,
  onChange,
}: {
  bundle: LanguageBundle;
  source: BundleSource;
  onChange: EditorChange;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="rounded-[20px] border-2 border-[#E8DCC4] bg-white p-4">
      <p className="font-bold break-words">{source.title}</p>
      <p className="text-sm break-words text-[#4A4130]">
        {SOURCE_KIND_LABELS[source.kind]}
        {source.year ? ` · ${source.year}` : ""} · id «{source.id}» ·{" "}
        {usageText(bundle, source.id)}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          aria-label={`Editar «${source.title}»`}
          type="button"
          aria-expanded={editing}
          onClick={() => setEditing(!editing)}
          className={secondaryButton}
        >
          Editar
        </button>
        <button
          aria-label={`Quitar «${source.title}»`}
          type="button"
          onClick={() => {
            const result = removeSource(bundle, source.id);
            onChange(
              result.ok ? result.bundle : null,
              result.ok ? `Fuente «${source.title}» quitada.` : result.reason,
            );
          }}
          className={dangerButton}
        >
          Quitar
        </button>
      </div>
      {editing ? (
        <SourceForm
          initial={sourceToFields(source)}
          submitLabel="Guardar"
          onSubmit={(fields) => {
            onChange(
              updateSource(bundle, source.id, fields),
              `Fuente «${fields.title.trim()}» guardada.`,
            );
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : null}
    </li>
  );
}

/** «Fuentes»: every word, example and the alphabet cite one of these. */
export function SourcesPanel({ bundle, onChange }: SourcesPanelProps) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      {adding ? (
        <section aria-label="Fuente nueva">
          <h3 className="font-bold">Fuente nueva</h3>
          <SourceForm
            initial={EMPTY_SOURCE_FIELDS}
            submitLabel="Agregar"
            onSubmit={(fields) => {
              const added = addSource(bundle, fields);
              onChange(
                added.bundle,
                `Fuente «${fields.title.trim()}» agregada.`,
              );
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${primaryButton} self-start`}
        >
          Agregar una fuente
        </button>
      )}
      <ul
        id={SOURCES_ANCHOR}
        tabIndex={-1}
        aria-label="Fuentes"
        className="flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
      >
        {bundle.sources.map((source) => (
          <SourceItem
            key={source.id}
            bundle={bundle}
            source={source}
            onChange={onChange}
          />
        ))}
      </ul>
    </div>
  );
}
