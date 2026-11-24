import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";

import {
  checkEntryFields,
  type EntryData,
  type EntryFieldErrors,
  type EntryFields,
  type ExampleFields,
  fieldsToEntryData,
} from "@/lib/language-bundles/edit-bundle";
import type { BundleEntry, LanguageBundle } from "@/lib/language-bundles/types";

import {
  checkboxLabel,
  primaryButton,
  secondaryButton,
} from "../bundle-admin/styles";
import { SelectField, TextField } from "./fields";
import { PART_OF_SPEECH_LABELS } from "./labels";

type EntryFormProps = {
  bundle: LanguageBundle;
  initial: EntryFields;
  /** The word being edited; absent when adding one. */
  entry?: BundleEntry;
  lang: string;
  submitLabel: string;
  onSubmit: (data: EntryData) => void;
  onCancel: () => void;
};

const PARTS = [
  { value: "", label: "Sin indicar" },
  ...Object.entries(PART_OF_SPEECH_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

function ExamplesField({
  examples,
  error,
  lang,
  onChange,
}: {
  examples: ExampleFields[];
  error?: string;
  lang: string;
  onChange: (examples: ExampleFields[]) => void;
}) {
  const set = (index: number, patch: Partial<ExampleFields>) =>
    onChange(
      examples.map((example, at) =>
        at === index ? { ...example, ...patch } : example,
      ),
    );
  return (
    <fieldset className="flex flex-col gap-3 sm:col-span-2">
      <legend className="text-sm font-bold">Ejemplos</legend>
      <p className="text-sm text-[#4A4130]">
        Sin ejemplos, la palabra no entra en «Completar palabras».
      </p>
      {examples.map((example, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-2"
        >
          <TextField
            label={`Oración ${index + 1}`}
            lang={lang || undefined}
            value={example.sentence}
            onChange={(sentence) => set(index, { sentence })}
          />
          <TextField
            label={`Traducción de la oración ${index + 1}`}
            value={example.translation}
            onChange={(translation) => set(index, { translation })}
          />
          <button
            type="button"
            onClick={() => onChange(examples.filter((_, at) => at !== index))}
            className={`${secondaryButton} sm:col-span-2 sm:justify-self-start`}
          >
            Quitar el ejemplo {index + 1}
          </button>
        </div>
      ))}
      {error ? (
        <p className="text-sm font-bold text-[#C7431C]">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={() =>
          onChange([...examples, { sentence: "", translation: "" }])
        }
        className={`${secondaryButton} self-start`}
      >
        Agregar un ejemplo
      </button>
    </fieldset>
  );
}

/**
 * The fields of one word. Checked on «Guardar», with each error next to its
 * field; the first one gets the focus.
 */
export function EntryForm({
  bundle,
  initial,
  entry,
  lang,
  submitLabel,
  onSubmit,
  onCancel,
}: EntryFormProps) {
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<EntryFieldErrors>({});
  const [verified, setVerified] = useState(entry?.verified ?? false);
  const [verifiedBy, setVerifiedBy] = useState(entry?.verifiedBy ?? "");
  const set = (patch: Partial<EntryFields>) =>
    setFields((current) => ({ ...current, ...patch }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = checkEntryFields(fields, bundle);
    if (Object.keys(found).length > 0) {
      const form = event.currentTarget;
      flushSync(() => setErrors(found));
      form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    onSubmit(
      fieldsToEntryData(fields, {
        verified,
        verifiedBy: verified ? verifiedBy.trim() : "",
        ...(entry?.audio ? { audio: entry.audio } : {}),
      }),
    );
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      className="mt-3 grid gap-4 rounded-[20px] bg-[#FBEFD2] p-4 sm:grid-cols-2"
    >
      <TextField
        label="Palabra"
        lang={lang || undefined}
        value={fields.word}
        error={errors.word}
        onChange={(word) => set({ word })}
      />
      <TextField
        label="Otras escrituras"
        hint="Separadas por comas."
        lang={lang || undefined}
        value={fields.variants}
        onChange={(variants) => set({ variants })}
      />
      <TextField
        label="Traducciones"
        hint="Una por línea. La primera es la que muestran los juegos."
        multiline
        value={fields.translations}
        error={errors.translations}
        onChange={(translations) => set({ translations })}
      />
      <SelectField
        label="Clase de palabra"
        value={fields.partOfSpeech}
        options={PARTS}
        onChange={(partOfSpeech) => set({ partOfSpeech })}
      />
      <TextField
        label="Dibujo (emoji)"
        hint="Sin emoji, la palabra no entra en los temas de dibujos."
        value={fields.emoji}
        error={errors.emoji}
        onChange={(emoji) => set({ emoji })}
      />
      <TextField
        label="Nota"
        multiline
        value={fields.notes}
        onChange={(notes) => set({ notes })}
      />
      <SelectField
        label="Fuente"
        value={fields.sourceId}
        error={errors.sourceId}
        options={[
          { value: "", label: "Elige una fuente" },
          ...bundle.sources.map((source) => ({
            value: source.id,
            label: source.title,
          })),
        ]}
        onChange={(sourceId) => set({ sourceId })}
      />
      <TextField
        label="Dónde en la fuente"
        hint="Por ejemplo: p. 112."
        value={fields.sourceRef}
        onChange={(sourceRef) => set({ sourceRef })}
      />
      <ExamplesField
        examples={fields.examples}
        error={errors.examples}
        lang={lang}
        onChange={(examples) => set({ examples })}
      />
      <div className="flex flex-col gap-3 sm:col-span-2">
        <label className={checkboxLabel}>
          <input
            type="checkbox"
            checked={verified}
            onChange={(event) => setVerified(event.target.checked)}
            className="size-5"
          />
          Verificada: puede aparecer en el sitio
        </label>
        {verified ? (
          <TextField
            label="Quién o qué la verificó"
            value={verifiedBy}
            onChange={setVerifiedBy}
          />
        ) : null}
      </div>
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
