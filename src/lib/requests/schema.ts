import { z } from "zod";

export const REQUEST_ROLES = ["donador", "editor"] as const;
export type RequestRole = (typeof REQUEST_ROLES)[number];

export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const REASON_MIN_LENGTH = 10;
export const REASON_MAX_LENGTH = 1000;

const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;
// Digits and spaces, with an optional "+" only at the very start.
const PHONE_PATTERN = /^\+?[\d\s]+$/;

export const messages = {
  name: "Ingresa tu nombre.",
  nameTooLong: `El nombre no puede pasar de ${NAME_MAX_LENGTH} caracteres.`,
  phone: "Ingresa un teléfono de 7 a 15 dígitos.",
  email: "Ingresa un correo válido.",
  role: "Elige una opción.",
  reasonTooShort: "Cuéntanos un poco más (mínimo 10 caracteres).",
  reasonTooLong: `El motivo no puede pasar de ${REASON_MAX_LENGTH} caracteres.`,
  consent: "Debes aceptar para poder enviar.",
} as const;

// Postgres char_length counts Unicode characters, not UTF-16 units, so the
// motivo has to be counted the same way or an emoji-heavy text would pass here
// and then be rejected by the database check.
export function countCharacters(value: string): number {
  return [...value].length;
}

function isValidPhone(value: string): boolean {
  if (!PHONE_PATTERN.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

// The keys match the JSON contract and the table columns (Spanish on purpose).
export const requestSchema = z.object({
  nombre: z
    .string({ error: messages.name })
    .trim()
    .min(1, messages.name)
    .max(NAME_MAX_LENGTH, messages.nameTooLong),
  telefono: z
    .string({ error: messages.phone })
    .trim()
    .refine(isValidPhone, messages.phone)
    .transform((value) => value.replace(/\s+/g, " ")),
  email: z
    .string({ error: messages.email })
    .trim()
    .max(EMAIL_MAX_LENGTH, messages.email)
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      messages.email,
    )
    .optional()
    .transform((value) => (value ? value : undefined)),
  rol: z.enum(REQUEST_ROLES, { error: messages.role }),
  motivo: z
    .string({ error: messages.reasonTooShort })
    .trim()
    .refine(
      (value) => countCharacters(value) >= REASON_MIN_LENGTH,
      messages.reasonTooShort,
    )
    .refine(
      (value) => countCharacters(value) <= REASON_MAX_LENGTH,
      messages.reasonTooLong,
    ),
  consentimiento: z.literal(true, { error: messages.consent }),
});

export type RequestInput = z.input<typeof requestSchema>;
export type RequestData = z.output<typeof requestSchema>;
export type FieldErrors = Partial<Record<keyof RequestInput, string>>;

// First message per top-level field, which is what the form shows under it.
export function collectFieldErrors(error: z.ZodError): FieldErrors {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fields)) {
      fields[key] = issue.message;
    }
  }
  return fields;
}
