"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  clampReason,
  emptyValues,
  firstInvalidField,
  ROLE_LABELS,
  submitRequest,
  validateForm,
} from "@/lib/requests/form";
import type { FieldName, FormValues } from "@/lib/requests/form";
import {
  countCharacters,
  REASON_MAX_LENGTH,
  REQUEST_ROLES,
} from "@/lib/requests/schema";
import type { FieldErrors, RequestRole } from "@/lib/requests/schema";

const ROLE_ITEMS = REQUEST_ROLES.map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

/**
 * The form's state lives above the dialog, not inside it: closing the dialog
 * unmounts its content, and what the person typed must survive an accidental
 * Esc. Only a successful send clears it.
 */
export function useSupportRequestForm(defaultRole: RequestRole) {
  const [values, setValues] = useState<FormValues>(() =>
    emptyValues(defaultRole),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // An object, so asking for the same field twice still re-runs the effect.
  const [focusRequest, setFocusRequest] = useState<{ name: FieldName } | null>(
    null,
  );
  const inFlight = useRef(false);
  const fields = useRef<Partial<Record<FieldName, HTMLElement | null>>>({});

  function setValue<Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    // Editing a field is the person answering its error.
    setErrors((current) => {
      if (!(key in current)) return current;
      const rest = { ...current };
      delete rest[key as keyof FieldErrors];
      return rest;
    });
  }

  // Ref callback for a field, so submit can send focus to the first error.
  function register(name: FieldName) {
    return (node: HTMLElement | null) => {
      fields.current[name] = node;
    };
  }

  // Focus waits for the render: during a send every field is disabled, and a
  // disabled field cannot take focus.
  useEffect(() => {
    if (focusRequest) fields.current[focusRequest.name]?.focus();
  }, [focusRequest]);

  function focusFirstError(found: FieldErrors) {
    const name = firstInvalidField(found);
    if (name) setFocusRequest({ name });
  }

  async function submit(onSuccess: (message: string) => void) {
    if (inFlight.current) return;
    setFormError(null);

    const found = validateForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    const outcome = await submitRequest(values);
    inFlight.current = false;
    setSubmitting(false);

    if (outcome.kind === "success") {
      setValues(emptyValues(defaultRole));
      onSuccess(outcome.message);
      return;
    }
    if (outcome.kind === "invalid") {
      setErrors(outcome.fields);
      focusFirstError(outcome.fields);
    }
    setFormError(outcome.message);
  }

  return { values, errors, formError, submitting, register, setValue, submit };
}

type SupportRequestFormProps = {
  form: ReturnType<typeof useSupportRequestForm>;
  onSuccess: (message: string) => void;
};

export function SupportRequestForm({
  form,
  onSuccess,
}: SupportRequestFormProps) {
  const id = useId();
  const { values, errors, formError, submitting, register, setValue } = form;

  const fieldId = (name: string) => `${id}-${name}`;
  const errorId = (name: FieldName) => `${id}-${name}-error`;
  const invalidProps = (name: FieldName, extraDescription?: string) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby":
      [errors[name] ? errorId(name) : undefined, extraDescription]
        .filter(Boolean)
        .join(" ") || undefined,
  });
  const error = (name: FieldName) =>
    errors[name] ? (
      <p id={errorId(name)} className="text-destructive text-sm">
        {errors[name]}
      </p>
    ) : null;

  const reasonLength = countCharacters(values.motivo);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit(onSuccess);
      }}
      className="grid gap-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor={fieldId("nombre")}>Nombre</Label>
        <Input
          id={fieldId("nombre")}
          name="nombre"
          autoComplete="name"
          value={values.nombre}
          disabled={submitting}
          ref={register("nombre")}
          onChange={(event) => setValue("nombre", event.target.value)}
          {...invalidProps("nombre")}
        />
        {error("nombre")}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={fieldId("telefono")}>Teléfono</Label>
        <Input
          id={fieldId("telefono")}
          name="telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.telefono}
          disabled={submitting}
          ref={register("telefono")}
          onChange={(event) => setValue("telefono", event.target.value)}
          {...invalidProps("telefono")}
        />
        {error("telefono")}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={fieldId("email")}>
          Correo electrónico{" "}
          <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          id={fieldId("email")}
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          disabled={submitting}
          ref={register("email")}
          onChange={(event) => setValue("email", event.target.value)}
          {...invalidProps("email")}
        />
        {error("email")}
      </div>

      <div className="grid gap-1.5">
        <Label id={fieldId("rol-label")}>¿Cómo quieres apoyar?</Label>
        <Select
          value={values.rol}
          items={ROLE_ITEMS}
          disabled={submitting}
          onValueChange={(value) => {
            if (value) setValue("rol", value as RequestRole);
          }}
        >
          <SelectTrigger
            className="w-full"
            aria-labelledby={fieldId("rol-label")}
            ref={register("rol")}
            {...invalidProps("rol")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error("rol")}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={fieldId("motivo")}>Motivo</Label>
        <Textarea
          id={fieldId("motivo")}
          name="motivo"
          rows={4}
          className="max-h-48"
          value={values.motivo}
          disabled={submitting}
          ref={register("motivo")}
          onChange={(event) =>
            setValue("motivo", clampReason(event.target.value))
          }
          {...invalidProps("motivo", fieldId("motivo-count"))}
        />
        <p
          id={fieldId("motivo-count")}
          className="text-muted-foreground text-right text-xs"
        >
          {reasonLength} / {REASON_MAX_LENGTH}
        </p>
        {error("motivo")}
      </div>

      <div className="grid gap-1.5">
        <label className="flex items-start gap-2 text-sm leading-snug">
          <Checkbox
            className="mt-0.5"
            checked={values.consentimiento}
            disabled={submitting}
            ref={register("consentimiento")}
            onCheckedChange={(checked) => setValue("consentimiento", checked)}
            aria-labelledby={fieldId("consent-text")}
            {...invalidProps("consentimiento")}
          />
          <span id={fieldId("consent-text")}>
            Acepto que me contacten sobre mi solicitud y que mis datos se
            guarden para ese fin.
          </span>
        </label>
        <p className="text-muted-foreground text-xs">
          Más información en nuestra{" "}
          <Link
            href="/privacidad"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2"
          >
            Política de privacidad
          </Link>
          .
        </p>
        {error("consentimiento")}
      </div>

      {/* Honeypot. Off-screen rather than display:none, which bots detect. */}
      <div className="relative">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={values.website}
          onChange={(event) => setValue("website", event.target.value)}
          className="absolute -left-[9999px] h-px w-px"
        />
      </div>

      {formError ? (
        <p role="alert" className="text-destructive text-sm font-bold">
          {formError}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={submitting}
        className="rounded-full px-5 py-2.5 cursor-pointer"
      >
        {submitting ? "Enviando…" : "Enviar solicitud"}
      </Button>
    </form>
  );
}
