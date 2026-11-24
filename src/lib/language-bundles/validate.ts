import { normalize } from "../dictionary/text.ts";
import { normalizeGrapheme } from "../language-packs/graphemes.ts";
import { playableThemes } from "../language-packs/playable.ts";

import { bundleToPack } from "./adapters.ts";
import { lettersOutsideAlphabet } from "./edit-bundle.ts";
import type { BundleEntry, LanguageBundle } from "./types.ts";

/** A serialized bundle this size or bigger is refused (spec decision #14). */
export const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;

export type BundleIssueCode =
  // Errors: they block publishing (spec §4.2).
  | "language_mismatch"
  | "unknown_source"
  | "duplicate_id"
  | "unknown_entry"
  | "empty_alphabet"
  | "too_large"
  | "audio_outside_bucket"
  // Warnings: they explain what will not be shown.
  | "letter_outside_alphabet"
  | "unverified"
  | "theme_not_playable"
  | "missing_emoji"
  | "duplicate_word"
  | "vowel_outside_alphabet"
  | "unknown_example_source";

export type BundleIssue = {
  code: BundleIssueCode;
  /** Spanish: shown to the editor as is. */
  message: string;
  entryId?: string;
  themeId?: string;
};

export type BundleValidation = {
  errors: BundleIssue[];
  warnings: BundleIssue[];
};

export type ValidateBundleOptions = {
  /** The language being edited; a bundle of another one is refused. */
  language?: string;
  /** Public URL of the audio bucket; `audio` outside it is refused. */
  audioBaseUrl?: string;
};

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated];
}

function duplicateIdErrors(bundle: LanguageBundle): BundleIssue[] {
  const groups: [string, string[]][] = [
    ["palabra", bundle.entries.map((entry) => entry.id)],
    ["fuente", bundle.sources.map((source) => source.id)],
    ["tema", bundle.themes.map((theme) => theme.id)],
  ];
  return groups.flatMap(([label, ids]) =>
    duplicates(ids).map((id) => ({
      code: "duplicate_id" as const,
      message: `Hay más de una ${label} con el id «${id}».`,
    })),
  );
}

function entryErrors(
  entry: BundleEntry,
  sourceIds: Set<string>,
  audioBaseUrl: string | undefined,
): BundleIssue[] {
  const issues: BundleIssue[] = [];
  if (!sourceIds.has(entry.sourceId)) {
    issues.push({
      code: "unknown_source",
      message: `«${entry.word}» cita la fuente «${entry.sourceId}», que no está en «sources».`,
      entryId: entry.id,
    });
  }
  if (entry.audio && audioBaseUrl) {
    const base = `${audioBaseUrl.replace(/\/+$/, "")}/`;
    if (!entry.audio.startsWith(base)) {
      issues.push({
        code: "audio_outside_bucket",
        message: `El audio de «${entry.word}» no está en el bucket de audio del proyecto.`,
        entryId: entry.id,
      });
    }
  }
  return issues;
}

function structureErrors(
  bundle: LanguageBundle,
  options: ValidateBundleOptions,
): BundleIssue[] {
  const errors: BundleIssue[] = [];
  if (options.language !== undefined && options.language !== bundle.language) {
    errors.push({
      code: "language_mismatch",
      message: `El paquete es de «${bundle.language}», pero estás editando «${options.language}».`,
    });
  }
  if (bundle.alphabet.graphemes.length === 0) {
    errors.push({
      code: "empty_alphabet",
      message: "El alfabeto no tiene letras.",
    });
  }
  if (
    new TextEncoder().encode(JSON.stringify(bundle)).length >= MAX_BUNDLE_BYTES
  ) {
    errors.push({
      code: "too_large",
      message: "El paquete pesa 2 MB o más.",
    });
  }
  return errors;
}

function themeReferenceErrors(bundle: LanguageBundle): BundleIssue[] {
  const entryIds = new Set(bundle.entries.map((entry) => entry.id));
  return bundle.themes.flatMap((theme) =>
    theme.entryIds
      .filter((id) => !entryIds.has(id))
      .map((id) => ({
        code: "unknown_entry" as const,
        message: `El tema «${theme.name}» apunta a la palabra «${id}», que no existe.`,
        themeId: theme.id,
      })),
  );
}

function letterWarnings(bundle: LanguageBundle): BundleIssue[] {
  const graphemes = bundle.alphabet.graphemes;
  const known = new Set(graphemes.map(normalizeGrapheme));
  const warnings: BundleIssue[] = bundle.alphabet.vowels
    .filter((vowel) => !known.has(normalizeGrapheme(vowel)))
    .map((vowel) => ({
      code: "vowel_outside_alphabet" as const,
      message: `La vocal «${vowel}» no está entre las letras del alfabeto.`,
    }));

  for (const entry of bundle.entries) {
    const outside = lettersOutsideAlphabet(entry.word, graphemes);
    if (outside.length > 0) {
      warnings.push({
        code: "letter_outside_alphabet",
        message: `«${entry.word}» usa letras que no están en el alfabeto: ${outside.join(", ")}.`,
        entryId: entry.id,
      });
    }
  }
  return warnings;
}

function entryWarnings(
  bundle: LanguageBundle,
  sourceIds: Set<string>,
): BundleIssue[] {
  const warnings: BundleIssue[] = [];
  const byWord = new Map<string, string>();
  for (const entry of bundle.entries) {
    if (!entry.verified) {
      warnings.push({
        code: "unverified",
        message: `«${entry.word}» no está verificada: no aparece en el sitio.`,
        entryId: entry.id,
      });
    }
    const word = normalize(entry.word);
    const first = byWord.get(word);
    if (first) {
      warnings.push({
        code: "duplicate_word",
        message: `«${entry.word}» está dos veces («${first}» y «${entry.id}»).`,
        entryId: entry.id,
      });
    } else {
      byWord.set(word, entry.id);
    }
    for (const example of entry.examples ?? []) {
      if (example.sourceId && !sourceIds.has(example.sourceId)) {
        warnings.push({
          code: "unknown_example_source",
          message: `Un ejemplo de «${entry.word}» cita la fuente «${example.sourceId}», que no está en «sources».`,
          entryId: entry.id,
        });
      }
    }
  }
  return warnings;
}

const PICTURE_MODES = new Set(["pic2word", "word2pic"]);

function themeWarnings(bundle: LanguageBundle): BundleIssue[] {
  const byId = new Map(bundle.entries.map((entry) => [entry.id, entry]));
  const playable = new Set(
    playableThemes(bundleToPack(bundle, { name: "", isoCode: "" })).map(
      (theme) => theme.id,
    ),
  );
  const warnings: BundleIssue[] = [];
  for (const theme of bundle.themes) {
    if (!playable.has(theme.id)) {
      warnings.push({
        code: "theme_not_playable",
        message: `El tema «${theme.name}» no tiene suficientes palabras verificadas para jugarse.`,
        themeId: theme.id,
      });
    }
    if (!PICTURE_MODES.has(theme.mode)) continue;
    for (const id of theme.entryIds) {
      const entry = byId.get(id);
      if (entry && !entry.emoji) {
        warnings.push({
          code: "missing_emoji",
          message: `«${entry.word}» no tiene dibujo y el tema «${theme.name}» lo necesita.`,
          entryId: entry.id,
          themeId: theme.id,
        });
      }
    }
  }
  return warnings;
}

/**
 * The rules of spec §4.2, on a bundle `parseBundle` already accepted. Errors
 * block publishing; warnings explain what will not be shown. Pure.
 */
export function validateBundle(
  bundle: LanguageBundle,
  options: ValidateBundleOptions = {},
): BundleValidation {
  const sourceIds = new Set(bundle.sources.map((source) => source.id));
  return {
    errors: [
      ...structureErrors(bundle, options),
      ...duplicateIdErrors(bundle),
      ...bundle.entries.flatMap((entry) =>
        entryErrors(entry, sourceIds, options.audioBaseUrl),
      ),
      ...themeReferenceErrors(bundle),
    ],
    warnings: [
      ...letterWarnings(bundle),
      ...entryWarnings(bundle, sourceIds),
      ...themeWarnings(bundle),
    ],
  };
}
