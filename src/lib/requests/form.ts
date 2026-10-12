import {
  collectFieldErrors,
  countCharacters,
  REASON_MAX_LENGTH,
  requestSchema,
} from "@/lib/requests/schema";
import type { FieldErrors, RequestRole } from "@/lib/requests/schema";

// Everything the form does that is not rendering, so it can be tested without
// a browser: what the fields hold, whether they are valid, and what the server's
// answer means for the person looking at the form.

export type FormValues = {
  nombre: string;
  telefono: string;
  email: string;
  rol: RequestRole;
  motivo: string;
  consentimiento: boolean;
  /** Honeypot: people never see it, so it stays empty. */
  website: string;
};

export type FieldName = Exclude<keyof FormValues, "website">;

/** The order the fields appear in, which is where focus goes on an error. */
export const FIELD_ORDER: readonly FieldName[] = [
  "nombre",
  "telefono",
  "email",
  "rol",
  "motivo",
  "consentimiento",
];

export const ROLE_LABELS: Record<RequestRole, string> = {
  donador: "Donador",
  editor: "Editor",
};

export const SUBMIT_MESSAGES = {
  generic: "No pudimos enviar tu solicitud. Intenta de nuevo más tarde.",
  network: "No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.",
  success: "¡Gracias! Recibimos tu solicitud y te contactaremos pronto.",
} as const;

export function emptyValues(role: RequestRole): FormValues {
  return {
    nombre: "",
    telefono: "",
    email: "",
    rol: role,
    motivo: "",
    consentimiento: false,
    website: "",
  };
}

// maxLength on a textarea counts UTF-16 units, which would cut an emoji-heavy
// text short of the real 1000 characters, so the cap is applied by hand.
export function clampReason(value: string): string {
  if (countCharacters(value) <= REASON_MAX_LENGTH) return value;
  return [...value].slice(0, REASON_MAX_LENGTH).join("");
}

/** Empty when the values are valid. The server runs the same schema. */
export function validateForm(values: FormValues): FieldErrors {
  const result = requestSchema.safeParse(values);
  return result.success ? {} : collectFieldErrors(result.error);
}

export function firstInvalidField(errors: FieldErrors): FieldName | undefined {
  return FIELD_ORDER.find((name) => errors[name] !== undefined);
}

export function buildPayload(values: FormValues): FormValues {
  return {
    nombre: values.nombre.trim(),
    telefono: values.telefono.trim(),
    email: values.email.trim(),
    rol: values.rol,
    motivo: values.motivo.trim(),
    consentimiento: values.consentimiento,
    website: values.website,
  };
}

export type SubmitOutcome =
  | { kind: "success"; message: string }
  | { kind: "invalid"; message: string; fields: FieldErrors }
  | { kind: "failed"; message: string };

function readMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const { message } = body;
    if (typeof message === "string" && message !== "") return message;
  }
  return fallback;
}

function readFields(body: unknown): FieldErrors {
  if (typeof body !== "object" || body === null || !("fields" in body)) {
    return {};
  }
  const { fields } = body;
  if (typeof fields !== "object" || fields === null) return {};

  const known: FieldErrors = {};
  for (const name of FIELD_ORDER) {
    const message = (fields as Record<string, unknown>)[name];
    if (typeof message === "string") known[name] = message;
  }
  return known;
}

export async function submitRequest(
  values: FormValues,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitOutcome> {
  let response: Response;
  try {
    response = await fetchImpl("/api/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(values)),
    });
  } catch {
    return { kind: "failed", message: SUBMIT_MESSAGES.network };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (response.ok) {
    return {
      kind: "success",
      message: readMessage(body, SUBMIT_MESSAGES.success),
    };
  }

  const fields = readFields(body);
  if (response.status === 400 && Object.keys(fields).length > 0) {
    return {
      kind: "invalid",
      message: readMessage(body, "Revisa los campos marcados."),
      fields,
    };
  }

  return {
    kind: "failed",
    message: readMessage(body, SUBMIT_MESSAGES.generic),
  };
}
