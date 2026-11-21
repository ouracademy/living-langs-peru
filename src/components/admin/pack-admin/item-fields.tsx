"use client";

import type { FieldErrors, ItemFields } from "@/lib/language-packs/edit-pack";

import { input } from "./styles";

type ItemFieldInputsProps = {
  idPrefix: string;
  values: ItemFields;
  errors: FieldErrors;
  /** `lang` of the word field: the pack's ISO code. */
  lang: string;
  onChange: (values: ItemFields) => void;
};

const FIELDS: {
  name: keyof ItemFields;
  label: string;
  hint?: string;
}[] = [
  { name: "word", label: "Palabra" },
  { name: "translation", label: "Traducción" },
  {
    name: "emoji",
    label: "Dibujo (emoji)",
    hint: "Opcional. Déjalo vacío si no tiene.",
  },
];

/** Word, translation and emoji, each with its label and its own error (E7). */
export function ItemFieldInputs({
  idPrefix,
  values,
  errors,
  lang,
  onChange,
}: ItemFieldInputsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {FIELDS.map(({ name, label, hint }) => {
        const id = `${idPrefix}-${name}`;
        const error = errors[name];
        const describedBy =
          [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined;
        return (
          <div key={name} className="flex min-w-0 flex-col gap-1">
            <label htmlFor={id} className="text-sm font-bold">
              {label}
            </label>
            <input
              id={id}
              name={name}
              type="text"
              value={values[name]}
              lang={name === "word" ? lang : undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              onChange={(event) =>
                onChange({ ...values, [name]: event.target.value })
              }
              className={input}
            />
            {hint ? (
              <span id={`${id}-hint`} className="text-xs text-[#4A4130]">
                {hint}
              </span>
            ) : null}
            {error ? (
              <span
                id={`${id}-error`}
                className="text-sm font-bold text-[#C7431C]"
              >
                {error}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
