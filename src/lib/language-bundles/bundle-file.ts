import { parseBundle } from "./schema.ts";
import type { BundleEntry, BundleLanguage, LanguageBundle } from "./types.ts";

/** A note longer than this is refused: it is a line in the history. */
export const MAX_NOTE_LENGTH = 500;

export type BundleImport =
  { ok: true; bundle: LanguageBundle } | { ok: false; problems: string[] };

/**
 * An uploaded `.json`, as /admin/lenguas takes it (spec gestor-lenguas §5):
 * parsed and checked against the schema. What does not parse is refused
 * whole, so the working copy never changes halfway.
 */
export function importBundleText(text: string): BundleImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      problems: ["El archivo no es un JSON válido. Revisa que esté completo."],
    };
  }

  const parsed = parseBundle(data);
  return parsed.ok
    ? { ok: true, bundle: parsed.bundle }
    : { ok: false, problems: parsed.issues };
}

/** The bundle as a file again. Importing this text gives the same bundle. */
export function exportBundleText(bundle: LanguageBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

/** `uro-v3.json`, `uro-copia.json`, `uro-plantilla.json`. */
export function bundleFileName(
  language: string,
  version?: number | "plantilla",
): string {
  if (version === "plantilla") return `${language}-plantilla.json`;
  return version === undefined
    ? `${language}-copia.json`
    : `${language}-v${version}.json`;
}

export type BundleSummary = {
  entries: number;
  verified: number;
  themes: number;
};

/** What the status lines count (spec gestor-lenguas §5). */
export function summarizeBundle(bundle: LanguageBundle): BundleSummary {
  return {
    entries: bundle.entries.length,
    verified: bundle.entries.filter((entry) => entry.verified).length,
    themes: bundle.themes.length,
  };
}

/**
 * The empty starting point «Descargar plantilla» offers: the same as
 * docs/gestor-lenguas/plantilla-uro.json, for either language. Every value to
 * replace says COMPLETAR or PRUEBA; nothing in it is a real word.
 */
export function bundleTemplate(
  language: BundleLanguage,
): LanguageBundle & { $schema: string } {
  return {
    $schema: "./language-bundle.schema.json",
    schema: "language-bundle/1",
    language,
    translationLabel: "castellano",
    alphabet: {
      graphemes: ["COMPLETAR"],
      vowels: ["COMPLETAR"],
      sourceId: "fuente-del-alfabeto",
    },
    speech: { lang: "es-PE", quality: "approx" },
    sources: [
      {
        id: "fuente-del-alfabeto",
        kind: "publication",
        title: "COMPLETAR: obra o norma de donde sale el alfabeto",
        year: 1934,
        url: "https://COMPLETAR",
        note: "COMPLETAR: por qué se usa esta fuente y su licencia o permiso.",
      },
    ],
    entries: [
      {
        id: "prueba-uno",
        word: "PRUEBA uno",
        translations: ["traducción de PRUEBA"],
        partOfSpeech: "noun",
        examples: [
          {
            sentence: "Oración de PRUEBA uno",
            translation: "Traducción de la oración de PRUEBA",
          },
        ],
        emoji: "🧪",
        sourceId: "fuente-del-alfabeto",
        sourceRef: "p. COMPLETAR",
        verified: false,
      },
    ],
    themes: [
      {
        id: "dibujo-palabra",
        name: "Dibujo → palabra",
        icon: "🖼️",
        mode: "pic2word",
        entryIds: ["prueba-uno"],
      },
    ],
  };
}

export type BundleDiff = {
  /** Entry ids only in the new bundle. */
  added: string[];
  /** Entry ids in both, with any field different. */
  changed: string[];
  /** Entry ids only in the old bundle: replacing drops them. */
  missing: string[];
  /** Whether alphabet, sources, themes or labels differ too. */
  restChanged: boolean;
};

function sameEntry(left: BundleEntry, right: BundleEntry): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * What replacing `before` with `after` would do (spec decision #13), by entry
 * id: the summary the editor confirms before an upload replaces the working
 * copy.
 */
export function diffBundles(
  before: LanguageBundle,
  after: LanguageBundle,
): BundleDiff {
  const old = new Map(before.entries.map((entry) => [entry.id, entry]));
  const next = new Map(after.entries.map((entry) => [entry.id, entry]));

  const added = after.entries
    .filter((entry) => !old.has(entry.id))
    .map((entry) => entry.id);
  const changed = after.entries
    .filter((entry) => {
      const previous = old.get(entry.id);
      return previous !== undefined && !sameEntry(previous, entry);
    })
    .map((entry) => entry.id);
  const missing = before.entries
    .filter((entry) => !next.has(entry.id))
    .map((entry) => entry.id);

  const rest = (bundle: LanguageBundle) =>
    JSON.stringify({ ...bundle, entries: [] });

  return { added, changed, missing, restChanged: rest(before) !== rest(after) };
}

/** Whether replacing would change anything at all. */
export function isEmptyDiff(diff: BundleDiff): boolean {
  return (
    diff.added.length === 0 &&
    diff.changed.length === 0 &&
    diff.missing.length === 0 &&
    !diff.restChanged
  );
}
