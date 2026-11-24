import { useId, type ReactNode } from "react";

import { input } from "../pack-admin/styles";

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  children: (ids: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
};

/** A label, an optional hint and an error tied to the control (WCAG 3.3.1). */
function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-pista`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-[#4A4130]">
          {hint}
        </p>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} className="text-sm font-bold text-[#C7431C]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  multiline?: boolean;
  lang?: string;
  inputMode?: "numeric" | "url" | "text";
};

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  multiline = false,
  lang,
  inputMode,
}: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) =>
        multiline ? (
          <textarea
            id={id}
            value={value}
            rows={3}
            lang={lang}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
            className={input}
          />
        ) : (
          <input
            id={id}
            value={value}
            lang={lang}
            inputMode={inputMode}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
            className={input}
          />
        )
      }
    </FieldShell>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  hint?: string;
};

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
}: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          value={value}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          className={input}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
