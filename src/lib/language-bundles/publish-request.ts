import { z } from "zod";

import { MAX_NOTE_LENGTH } from "./bundle-file.ts";
import { parseBundle } from "./schema.ts";
import type { LanguageBundle } from "./types.ts";
import { type BundleIssue, validateBundle } from "./validate.ts";

const bodySchema = z.object({
  bundle: z.unknown(),
  // 0 = nothing published yet; null = «Publicar igual».
  expectedVersion: z.number().int().min(0).nullable(),
  note: z.string(),
});

export type BundlePublishRequestError =
  | "invalid_request"
  | "bundle_invalid"
  | "bundle_has_errors"
  | "note_required"
  | "note_too_long";

export type BundlePublishRequest =
  | {
      ok: true;
      bundle: LanguageBundle;
      expectedVersion: number | null;
      note: string;
    }
  | {
      ok: false;
      error: BundlePublishRequestError;
      message: string;
      issues?: BundleIssue[];
      problems?: string[];
    };

function noteProblem(
  note: string,
): Extract<BundlePublishRequest, { ok: false }> | null {
  if (note === "") {
    return {
      ok: false,
      error: "note_required",
      message: "Escribe una nota: quién revisó el contenido y qué cambia.",
    };
  }
  if (note.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: "note_too_long",
      message: `La nota puede tener hasta ${MAX_NOTE_LENGTH} caracteres.`,
    };
  }
  return null;
}

/**
 * What the /admin/lenguas publish handler accepts (spec gestor-lenguas §4.2,
 * §5): the bundle is parsed and validated again here whatever the browser
 * did, and a note is required. Pure: the handler passes the body, the
 * language and the audio bucket URL in.
 */
export function readBundlePublishRequest(
  body: unknown,
  language: string,
  audioBaseUrl?: string,
): BundlePublishRequest {
  const shape = bodySchema.safeParse(body);
  if (!shape.success) {
    return {
      ok: false,
      error: "invalid_request",
      message: "La solicitud no tiene la forma esperada.",
    };
  }

  const note = shape.data.note.trim();
  const badNote = noteProblem(note);
  if (badNote) return badNote;

  const parsed = parseBundle(shape.data.bundle);
  if (!parsed.ok) {
    return {
      ok: false,
      error: "bundle_invalid",
      message: "El archivo no tiene el formato de un paquete de lengua.",
      problems: parsed.issues,
    };
  }

  const { errors } = validateBundle(parsed.bundle, {
    language,
    ...(audioBaseUrl ? { audioBaseUrl } : {}),
  });
  if (errors.length > 0) {
    return {
      ok: false,
      error: "bundle_has_errors",
      message: "El paquete tiene errores. Corrígelos antes de publicar.",
      issues: errors,
    };
  }

  return {
    ok: true,
    bundle: parsed.bundle,
    expectedVersion: shape.data.expectedVersion,
    note,
  };
}

const restoreSchema = z.object({
  version: z.number().int().min(1),
  expectedVersion: z.number().int().min(0).nullable(),
});

export type RestoreRequest =
  | { ok: true; version: number; expectedVersion: number | null }
  | { ok: false; error: "invalid_request"; message: string };

/** «Restaurar» publishes an old version as a new one; history is never rewritten. */
export function readRestoreRequest(body: unknown): RestoreRequest {
  const shape = restoreSchema.safeParse(body);
  return shape.success
    ? { ok: true, ...shape.data }
    : {
        ok: false,
        error: "invalid_request",
        message: "La solicitud no tiene la forma esperada.",
      };
}

/** The note a restore leaves in the history. */
export function restoreNote(version: number): string {
  return `Restaurada desde la versión ${version}.`;
}
