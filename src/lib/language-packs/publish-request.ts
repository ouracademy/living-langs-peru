import { z } from "zod";

import { cleanPack } from "./clean.ts";
import { MAX_NOTE_LENGTH } from "./pack-file.ts";
import { parsePack } from "./schema.ts";
import type { LanguagePack } from "./types.ts";
import { type Issue, validatePack } from "./validate.ts";

const bodySchema = z.object({
  pack: z.unknown(),
  // 0 = nothing published yet; null = «Publicar igual» (spec §9.1).
  expectedVersion: z.number().int().min(0).nullable(),
  note: z.string(),
});

export type PublishRequestError =
  | "invalid_request"
  | "pack_invalid"
  | "pack_has_errors"
  | "note_required"
  | "note_too_long";

export type PublishRequest =
  | {
      ok: true;
      pack: LanguagePack;
      expectedVersion: number | null;
      note: string;
    }
  | {
      ok: false;
      error: PublishRequestError;
      message: string;
      issues?: Issue[];
      problems?: string[];
    };

/**
 * What the publish handler accepts (spec §9.1). The server validates the pack
 * again whatever the browser did (AC-SP6-6) and requires a note (AC-SP6-12).
 * Pure: the handler passes the body, the language and the bucket URL in.
 */
export function readPublishRequest(
  body: unknown,
  language: string,
  audioBaseUrl: string,
): PublishRequest {
  const shape = bodySchema.safeParse(body);
  if (!shape.success) {
    return {
      ok: false,
      error: "invalid_request",
      message: "La solicitud no tiene la forma esperada.",
    };
  }

  const note = shape.data.note.trim();
  if (note === "") {
    return {
      ok: false,
      error: "note_required",
      message: "Escribe una nota: quién revisó el paquete y qué cambia.",
    };
  }
  if (note.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: "note_too_long",
      message: `La nota puede tener hasta ${MAX_NOTE_LENGTH} caracteres.`,
    };
  }

  const parsed = parsePack(shape.data.pack);
  if (!parsed.ok) {
    return {
      ok: false,
      error: "pack_invalid",
      message: "El paquete no tiene el formato esperado.",
      problems: parsed.issues,
    };
  }

  const pack = cleanPack(parsed.pack);
  const { errors } = validatePack(pack, { audioBaseUrl, language });
  if (errors.length > 0) {
    return {
      ok: false,
      error: "pack_has_errors",
      message: "El paquete tiene errores. Corrígelos antes de publicar.",
      issues: errors,
    };
  }

  return {
    ok: true,
    pack,
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

/** «Restaurar» publishes an old version as a new one (spec §6.2, AC-SP6-9). */
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
