import { CircleAlert } from "lucide-react";

import {
  DEFAULT_CREDIT,
  FIELD_LIMITS,
  type PhotoFieldName,
  type PhotoFieldProblems,
  type PhotoFields,
} from "@/lib/admin/photo-fields";

import { CharacterCount } from "./character-count";
import { LicenseSuggestions } from "./license-suggestions";

export const FIELD_LABELS: Record<PhotoFieldName, string> = {
  alt: "Descripción (para quien no ve la foto)",
  caption: "Pie de foto (opcional)",
  author: "Autor",
  license: "Licencia",
  url: "Dirección de origen (opcional, https://…)",
};

export const FIELD_NAMES: PhotoFieldName[] = [
  "alt",
  "caption",
  "author",
  "license",
  "url",
];

const HINTS: Partial<Record<PhotoFieldName, string>> = {
  alt: "Cuenta qué se ve, para quien no puede ver la foto. Ej.: «Casa de techo de palma junto al río, con tres personas en la entrada.»",
  author: `Quién tomó la foto. Si lo dejas vacío: «${DEFAULT_CREDIT.author}».`,
  license: `Si lo dejas vacío: «${DEFAULT_CREDIT.license}».`,
  url: "Si la foto viene de otra página (por ejemplo, Wikimedia Commons), pega su dirección. Si no, déjalo vacío.",
};

const COUNTED: Partial<Record<PhotoFieldName, { min?: number; max: number }>> =
  {
    alt: { min: FIELD_LIMITS.altMin, max: FIELD_LIMITS.altMax },
    caption: { max: FIELD_LIMITS.caption },
  };

export const fieldId = (idPrefix: string, name: string) =>
  `${idPrefix}-${name}`;

type PhotoFieldInputsProps = {
  idPrefix: string;
  fields: PhotoFields;
  problems: PhotoFieldProblems;
  disabled: boolean;
  onChange: (name: PhotoFieldName, value: string) => void;
};

/** The five text fields, shared by «Agregar foto» and «Editar». */
export function PhotoFieldInputs({
  idPrefix,
  fields,
  problems,
  disabled,
  onChange,
}: PhotoFieldInputsProps) {
  return (
    <>
      {FIELD_NAMES.map((name) => {
        const inputId = fieldId(idPrefix, name);
        const hintId = `${inputId}-hint`;
        const countId = `${inputId}-count`;
        const errorId = `${inputId}-error`;
        const counted = COUNTED[name];
        const describedBy = [
          HINTS[name] ? hintId : null,
          counted ? countId : null,
          problems[name] ? errorId : null,
        ]
          .filter(Boolean)
          .join(" ");
        const props = {
          id: inputId,
          name,
          value: fields[name],
          required: name === "alt",
          "aria-invalid": problems[name] ? true : undefined,
          "aria-describedby": describedBy || undefined,
          disabled,
          className:
            "min-h-11 rounded-xl border-2 border-[#E8DCC4] bg-white px-3 py-2 text-[#241D14] focus-visible:border-[#241D14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C] aria-[invalid=true]:border-[#C7431C]",
        };
        return (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={inputId} className="font-bold text-[#241D14]">
              {FIELD_LABELS[name]}
            </label>
            {HINTS[name] ? (
              <span id={hintId} className="text-sm text-[#4A4130]">
                {HINTS[name]}
              </span>
            ) : null}
            {name === "alt" ? (
              <textarea
                {...props}
                rows={3}
                onChange={(event) => onChange(name, event.target.value)}
              />
            ) : (
              <input
                {...props}
                type={name === "url" ? "url" : "text"}
                onChange={(event) => onChange(name, event.target.value)}
              />
            )}
            {counted ? (
              <CharacterCount
                id={countId}
                length={fields[name].trim().length}
                {...counted}
              />
            ) : null}
            {name === "license" ? (
              <LicenseSuggestions
                current={fields.license}
                disabled={disabled}
                onPick={(license) => {
                  onChange("license", license);
                  document.getElementById(inputId)?.focus();
                }}
              />
            ) : null}
            {problems[name] ? (
              <span
                id={errorId}
                className="flex items-start gap-1 text-sm font-bold text-[#C7431C]"
              >
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {problems[name]}
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
