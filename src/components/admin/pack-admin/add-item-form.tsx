"use client";

import { useEffect, useRef, useState } from "react";

import {
  checkItemFields,
  type FieldErrors,
  type ItemFields,
  type NewItem,
} from "@/lib/language-packs/edit-pack";
import type { PackSource, Theme } from "@/lib/language-packs/types";

import { ItemFieldInputs } from "./item-fields";
import { checkboxLabel, input, primaryButton, secondaryButton } from "./styles";

type AddItemFormProps = {
  theme: Theme;
  lang: string;
  sources: PackSource[];
  onAdd: (item: NewItem) => void;
};

const EMPTY: ItemFields = { word: "", translation: "", emoji: "" };

/**
 * «Agregar una palabra a este tema» (spec §9.5 E1, E8). Everything is typed by
 * the person; the source is picked from the pack's own sources.
 */
export function AddItemForm({ theme, lang, sources, onAdd }: AddItemFormProps) {
  const prefix = `agregar-${theme.id}`;
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ItemFields>(EMPTY);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [verified, setVerified] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const toggle = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"field" | "toggle" | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "field") document.getElementById(`${prefix}-word`)?.focus();
    if (target === "toggle") toggle.current?.focus();
  }, [open, prefix]);

  function show() {
    setValues(EMPTY);
    setErrors({});
    setVerified(false);
    setSourceId(sources[0]?.id ?? "");
    pendingFocus.current = "field";
    setOpen(true);
  }

  function hide() {
    pendingFocus.current = "toggle";
    setOpen(false);
  }

  function submit() {
    const found = checkItemFields(values, theme);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = (["word", "translation", "emoji"] as const).find(
        (name) => found[name],
      );
      document.getElementById(`${prefix}-${first}`)?.focus();
      return;
    }
    onAdd({ ...values, sourceId, verified });
    hide();
  }

  if (!open) {
    return (
      <button
        ref={toggle}
        type="button"
        onClick={show}
        className={secondaryButton}
      >
        Agregar una palabra a este tema
      </button>
    );
  }

  return (
    <form
      aria-labelledby={`${prefix}-titulo`}
      noValidate
      className="flex flex-col gap-3 rounded-xl bg-white px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      <h5 id={`${prefix}-titulo`} className="font-bold">
        Nueva palabra en «{theme.name}»
      </h5>
      <ItemFieldInputs
        idPrefix={prefix}
        values={values}
        errors={errors}
        lang={lang}
        onChange={setValues}
      />
      <div className="flex flex-col gap-1 sm:max-w-md">
        <label htmlFor={`${prefix}-fuente`} className="text-sm font-bold">
          Fuente
        </label>
        <select
          id={`${prefix}-fuente`}
          value={sourceId}
          onChange={(event) => setSourceId(event.target.value)}
          className={input}
        >
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.title}
            </option>
          ))}
          <option value="">Sin fuente (no se juega)</option>
        </select>
      </div>
      <label className={checkboxLabel}>
        <input
          type="checkbox"
          checked={verified}
          onChange={(event) => setVerified(event.target.checked)}
          className="size-5 accent-[#1B6E73]"
        />
        Verificada
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryButton}>
          Agregar
        </button>
        <button type="button" onClick={hide} className={secondaryButton}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
