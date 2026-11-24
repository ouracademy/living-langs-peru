import { normalize, slugify } from "../dictionary/text.ts";
import {
  normalizeGrapheme,
  tokenizeGraphemes,
} from "../language-packs/graphemes.ts";

import type {
  BundleEntry,
  BundleSource,
  BundleTheme,
  LanguageBundle,
  ThemeMode,
} from "./types.ts";

/**
 * The editor of /admin/lenguas/[lengua] (spec gestor-lenguas F3). Pure: every
 * function takes a bundle and returns a new one. Every result still passes
 * `parseBundle`, because the working copy is read back with it: so the last
 * source, letter or vowel, and the last word of a theme, cannot be removed.
 * Ids never change once given (spec decision #3). Nothing here writes a word:
 * everything comes from a person.
 */

export type EditResult =
  { ok: true; bundle: LanguageBundle } | { ok: false; reason: string };

function failed(reason: string): EditResult {
  return { ok: false, reason };
}

/** An id that matches ^[a-z0-9-]+$ and is not taken yet. */
export function uniqueId(
  text: string,
  taken: Iterable<string>,
  fallback: string,
): string {
  const used = new Set(taken);
  const base = slugify(text) || fallback;
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Drops optional keys left empty, so the JSON stays as a person would write it. */
function tidyEntry(entry: BundleEntry): BundleEntry {
  const next: BundleEntry = { ...entry };
  if (!next.variants?.length) delete next.variants;
  if (!next.examples?.length) delete next.examples;
  if (!next.partOfSpeech) delete next.partOfSpeech;
  for (const key of [
    "notes",
    "emoji",
    "audio",
    "sourceRef",
    "verifiedBy",
  ] as const) {
    if (!next[key]?.trim()) delete next[key];
  }
  return next;
}

// ─── Entries ──────────────────────────────────────────────────────────────

export type EntryData = Omit<BundleEntry, "id">;

export function updateEntry(
  bundle: LanguageBundle,
  id: string,
  patch: Partial<EntryData>,
): LanguageBundle {
  return {
    ...bundle,
    entries: bundle.entries.map((entry) =>
      entry.id === id ? tidyEntry({ ...entry, ...patch, id }) : entry,
    ),
  };
}

export function addEntry(
  bundle: LanguageBundle,
  data: EntryData,
): { bundle: LanguageBundle; id: string } {
  const id = uniqueId(
    data.word,
    bundle.entries.map((entry) => entry.id),
    "entrada",
  );
  return {
    id,
    bundle: {
      ...bundle,
      entries: [...bundle.entries, tidyEntry({ ...data, id })],
    },
  };
}

/** The themes that would be left with no word if `id` went away. */
export function themesLeftEmpty(
  bundle: LanguageBundle,
  id: string,
): BundleTheme[] {
  return bundle.themes.filter(
    (theme) => theme.entryIds.length === 1 && theme.entryIds[0] === id,
  );
}

/**
 * Removes a word and takes it out of every theme that shows it. When that
 * would leave a theme with no word, nothing changes: the theme is edited first.
 */
export function removeEntry(bundle: LanguageBundle, id: string): EditResult {
  const emptied = themesLeftEmpty(bundle, id);
  if (emptied.length > 0) {
    const names = emptied.map((theme) => `«${theme.name}»`).join(", ");
    return failed(
      `No se quitó: es la única palabra del tema ${names}. Agrega otra palabra a ese tema o quítalo primero.`,
    );
  }
  return {
    ok: true,
    bundle: {
      ...bundle,
      entries: bundle.entries.filter((entry) => entry.id !== id),
      themes: bundle.themes.map((theme) => ({
        ...theme,
        entryIds: theme.entryIds.filter((entryId) => entryId !== id),
      })),
    },
  };
}

/** The themes that show this word, by name. */
export function themesWithEntry(bundle: LanguageBundle, id: string): string[] {
  return bundle.themes
    .filter((theme) => theme.entryIds.includes(id))
    .map((theme) => theme.name);
}

/** «Marcar como verificadas»: a person's decision, recorded with who checked. */
export function verifyEntries(
  bundle: LanguageBundle,
  ids: Iterable<string>,
  verifiedBy: string,
): LanguageBundle {
  const chosen = new Set(ids);
  const by = verifiedBy.trim();
  return {
    ...bundle,
    entries: bundle.entries.map((entry) =>
      chosen.has(entry.id)
        ? tidyEntry({ ...entry, verified: true, verifiedBy: by })
        : entry,
    ),
  };
}

/** «Quitar la verificación»: the words stop showing on the site and games. */
export function unverifyEntries(
  bundle: LanguageBundle,
  ids: Iterable<string>,
): LanguageBundle {
  const chosen = new Set(ids);
  return {
    ...bundle,
    entries: bundle.entries.map((entry) =>
      chosen.has(entry.id)
        ? tidyEntry({ ...entry, verified: false, verifiedBy: "" })
        : entry,
    ),
  };
}

/** Of the chosen words, the ones each bulk action would actually change. */
export function verificationTargets(
  bundle: LanguageBundle,
  ids: Iterable<string>,
): { toVerify: string[]; toUnverify: string[] } {
  const chosen = new Set(ids);
  const picked = bundle.entries.filter((entry) => chosen.has(entry.id));
  return {
    toVerify: picked.filter((entry) => !entry.verified).map((e) => e.id),
    toUnverify: picked.filter((entry) => entry.verified).map((e) => e.id),
  };
}

/** Letters of a word that the alphabet does not have, normalised. */
export function lettersOutsideAlphabet(
  word: string,
  graphemes: string[],
): string[] {
  const known = new Set(graphemes.map(normalizeGrapheme));
  const outside = tokenizeGraphemes(word, graphemes)
    .map(normalizeGrapheme)
    .filter((token) => /\p{Letter}/u.test(token) && !known.has(token));
  return [...new Set(outside)];
}

export type EntryFilter = {
  query: string;
  unverified: boolean;
  noEmoji: boolean;
  outsideAlphabet: boolean;
};

export const NO_FILTER: EntryFilter = {
  query: "",
  unverified: false,
  noEmoji: false,
  outsideAlphabet: false,
};

function matchesQuery(entry: BundleEntry, query: string): boolean {
  if (!query) return true;
  return [entry.word, ...(entry.variants ?? []), ...entry.translations].some(
    (text) => normalize(text).includes(query),
  );
}

export function filterEntries(
  bundle: LanguageBundle,
  filter: EntryFilter,
): BundleEntry[] {
  const query = normalize(filter.query);
  const graphemes = bundle.alphabet.graphemes;
  return bundle.entries.filter(
    (entry) =>
      matchesQuery(entry, query) &&
      (!filter.unverified || !entry.verified) &&
      (!filter.noEmoji || !entry.emoji) &&
      (!filter.outsideAlphabet ||
        lettersOutsideAlphabet(entry.word, graphemes).length > 0),
  );
}

// ─── Entry form ───────────────────────────────────────────────────────────

export type ExampleFields = { sentence: string; translation: string };

/** What the word form edits, as text: one translation per line, variants by comma. */
export type EntryFields = {
  word: string;
  variants: string;
  translations: string;
  partOfSpeech: string;
  examples: ExampleFields[];
  notes: string;
  emoji: string;
  sourceId: string;
  sourceRef: string;
};

export type EntryFieldErrors = Partial<
  Record<"word" | "translations" | "emoji" | "sourceId" | "examples", string>
>;

/** An emoji is short: even a family or a flag stays under this. */
const MAX_EMOJI_LENGTH = 16;

const splitLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const splitCommas = (text: string) =>
  text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

/** The form of a new word, already pointing at a source when there is one. */
export function emptyEntryFields(sourceId = ""): EntryFields {
  return {
    word: "",
    variants: "",
    translations: "",
    partOfSpeech: "",
    examples: [],
    notes: "",
    emoji: "",
    sourceId,
    sourceRef: "",
  };
}

export function entryToFields(entry: BundleEntry): EntryFields {
  return {
    word: entry.word,
    variants: (entry.variants ?? []).join(", "),
    translations: entry.translations.join("\n"),
    partOfSpeech: entry.partOfSpeech ?? "",
    examples: (entry.examples ?? []).map((example) => ({
      sentence: example.sentence,
      translation: example.translation,
    })),
    notes: entry.notes ?? "",
    emoji: entry.emoji ?? "",
    sourceId: entry.sourceId,
    sourceRef: entry.sourceRef ?? "",
  };
}

export function checkEntryFields(
  fields: EntryFields,
  bundle: LanguageBundle,
): EntryFieldErrors {
  const errors: EntryFieldErrors = {};
  if (!fields.word.trim()) errors.word = "Escribe la palabra.";
  if (splitLines(fields.translations).length === 0) {
    errors.translations = "Escribe al menos una traducción.";
  }
  if (fields.emoji.trim().length > MAX_EMOJI_LENGTH) {
    errors.emoji = "Pon un solo emoji.";
  }
  if (!bundle.sources.some((source) => source.id === fields.sourceId)) {
    errors.sourceId = "Elige la fuente de la palabra.";
  }
  if (
    fields.examples.some(
      (example) => !example.sentence.trim() || !example.translation.trim(),
    )
  ) {
    errors.examples =
      "Cada ejemplo necesita la oración y su traducción, o quítalo.";
  }
  return errors;
}

/** The form's text back into entry data. Keeps what the form does not edit. */
export function fieldsToEntryData(
  fields: EntryFields,
  keep: Pick<BundleEntry, "verified" | "verifiedBy" | "audio"> = {
    verified: false,
  },
): EntryData {
  const partOfSpeech = fields.partOfSpeech as BundleEntry["partOfSpeech"];
  return {
    word: fields.word.trim(),
    variants: splitCommas(fields.variants),
    translations: splitLines(fields.translations),
    ...(partOfSpeech ? { partOfSpeech } : {}),
    examples: fields.examples.map((example) => ({
      sentence: example.sentence.trim(),
      translation: example.translation.trim(),
    })),
    notes: fields.notes.trim(),
    emoji: fields.emoji.trim(),
    sourceId: fields.sourceId,
    sourceRef: fields.sourceRef.trim(),
    verified: keep.verified,
    ...(keep.verifiedBy ? { verifiedBy: keep.verifiedBy } : {}),
    ...(keep.audio ? { audio: keep.audio } : {}),
  };
}

// ─── Themes ───────────────────────────────────────────────────────────────

export type ThemeData = { name: string; icon: string; mode: ThemeMode };

export function addTheme(
  bundle: LanguageBundle,
  data: ThemeData,
  entryIds: string[],
):
  | { ok: true; bundle: LanguageBundle; id: string }
  | { ok: false; reason: string } {
  const name = data.name.trim();
  const icon = data.icon.trim();
  if (!name || !icon)
    return { ok: false, reason: "Ponle nombre e icono al tema." };
  const ids = [...new Set(entryIds)];
  if (ids.length === 0) {
    return { ok: false, reason: "Elige al menos una palabra para el tema." };
  }
  const id = uniqueId(
    name,
    bundle.themes.map((theme) => theme.id),
    "tema",
  );
  return {
    ok: true,
    id,
    bundle: {
      ...bundle,
      themes: [
        ...bundle.themes,
        { id, name, icon, mode: data.mode, entryIds: ids },
      ],
    },
  };
}

export function updateTheme(
  bundle: LanguageBundle,
  id: string,
  patch: Partial<ThemeData>,
): EditResult {
  if (patch.name !== undefined && !patch.name.trim()) {
    return failed("El tema necesita un nombre.");
  }
  if (patch.icon !== undefined && !patch.icon.trim()) {
    return failed("El tema necesita un icono.");
  }
  return {
    ok: true,
    bundle: {
      ...bundle,
      themes: bundle.themes.map((theme) =>
        theme.id === id
          ? {
              ...theme,
              ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
              ...(patch.icon !== undefined ? { icon: patch.icon.trim() } : {}),
              ...(patch.mode ? { mode: patch.mode } : {}),
            }
          : theme,
      ),
    },
  };
}

export function removeTheme(
  bundle: LanguageBundle,
  id: string,
): LanguageBundle {
  return {
    ...bundle,
    themes: bundle.themes.filter((theme) => theme.id !== id),
  };
}

/** Puts a word in a theme or takes it out. A theme keeps at least one word. */
export function setThemeEntry(
  bundle: LanguageBundle,
  themeId: string,
  entryId: string,
  included: boolean,
): EditResult {
  const theme = bundle.themes.find((each) => each.id === themeId);
  if (!theme) return failed("Ese tema ya no existe.");
  const has = theme.entryIds.includes(entryId);
  if (included === has) return { ok: true, bundle };
  if (!included && theme.entryIds.length === 1) {
    return failed(
      `«${theme.name}» necesita al menos una palabra. Agrega otra antes de quitar esta, o quita el tema.`,
    );
  }
  const entryIds = included
    ? [...theme.entryIds, entryId]
    : theme.entryIds.filter((id) => id !== entryId);
  return {
    ok: true,
    bundle: {
      ...bundle,
      themes: bundle.themes.map((each) =>
        each.id === themeId ? { ...each, entryIds } : each,
      ),
    },
  };
}

// ─── Alphabet ─────────────────────────────────────────────────────────────

export function addGrapheme(bundle: LanguageBundle, text: string): EditResult {
  const grapheme = normalizeGrapheme(text.trim());
  if (!grapheme) return failed("Escribe la letra.");
  if (/\s/.test(grapheme)) return failed("Una letra no lleva espacios.");
  if (bundle.alphabet.graphemes.map(normalizeGrapheme).includes(grapheme)) {
    return failed(`«${grapheme}» ya está en el alfabeto.`);
  }
  return {
    ok: true,
    bundle: {
      ...bundle,
      alphabet: {
        ...bundle.alphabet,
        graphemes: [...bundle.alphabet.graphemes, grapheme],
      },
    },
  };
}

/** Takes a letter out, and out of the vowels and the confusables too. */
export function removeGrapheme(
  bundle: LanguageBundle,
  grapheme: string,
): EditResult {
  const { alphabet } = bundle;
  if (alphabet.graphemes.length === 1) {
    return failed("El alfabeto necesita al menos una letra.");
  }
  const isVowel = alphabet.vowels.includes(grapheme);
  if (isVowel && alphabet.vowels.length === 1) {
    return failed(
      `«${grapheme}» es la única vocal: marca otra vocal antes de quitarla.`,
    );
  }
  const confusable = alphabet.confusable
    ? Object.fromEntries(
        Object.entries(alphabet.confusable)
          .filter(([key]) => key !== grapheme)
          .map(([key, list]) => [
            key,
            list.filter((each) => each !== grapheme),
          ]),
      )
    : undefined;
  return {
    ok: true,
    bundle: {
      ...bundle,
      alphabet: {
        ...alphabet,
        graphemes: alphabet.graphemes.filter((each) => each !== grapheme),
        vowels: alphabet.vowels.filter((each) => each !== grapheme),
        ...(confusable ? { confusable } : {}),
      },
    },
  };
}

/** Moves a letter up (-1) or down (+1) in the order. */
export function moveGrapheme(
  bundle: LanguageBundle,
  index: number,
  delta: -1 | 1,
): LanguageBundle {
  const graphemes = [...bundle.alphabet.graphemes];
  const target = index + delta;
  if (target < 0 || target >= graphemes.length) return bundle;
  [graphemes[index], graphemes[target]] = [graphemes[target], graphemes[index]];
  return { ...bundle, alphabet: { ...bundle.alphabet, graphemes } };
}

/** Marks a letter as a vowel or not. The alphabet keeps at least one vowel. */
export function setVowel(
  bundle: LanguageBundle,
  grapheme: string,
  isVowel: boolean,
): EditResult {
  const { vowels, graphemes } = bundle.alphabet;
  const has = vowels.includes(grapheme);
  if (has === isVowel) return { ok: true, bundle };
  if (!isVowel && vowels.length === 1) {
    return failed("El alfabeto necesita al menos una vocal.");
  }
  // Vowels keep the alphabet's order, so the game shows them in that order.
  const next = isVowel
    ? graphemes.filter((each) => each === grapheme || vowels.includes(each))
    : vowels.filter((each) => each !== grapheme);
  return {
    ok: true,
    bundle: { ...bundle, alphabet: { ...bundle.alphabet, vowels: next } },
  };
}

export function setAlphabetSource(
  bundle: LanguageBundle,
  sourceId: string,
): LanguageBundle {
  const alphabet = { ...bundle.alphabet };
  if (sourceId) alphabet.sourceId = sourceId;
  else delete alphabet.sourceId;
  return { ...bundle, alphabet };
}

export type TextParse<T> =
  { ok: true; value: T } | { ok: false; reason: string };

/** «á=a, é=e» ⇄ { "á": "a", "é": "e" }. */
export function formatVowelVariants(record?: Record<string, string>): string {
  return Object.entries(record ?? {})
    .map(([from, to]) => `${from}=${to}`)
    .join(", ");
}

export function parseVowelVariants(
  text: string,
): TextParse<Record<string, string>> {
  const value: Record<string, string> = {};
  for (const pair of splitCommas(text)) {
    const [from, to, ...rest] = pair.split("=").map((part) => part.trim());
    if (!from || !to || rest.length > 0) {
      return {
        ok: false,
        reason: `«${pair}» no se entiende: escribe cada variante como á=a.`,
      };
    }
    value[from] = to;
  }
  return { ok: true, value };
}

/** One line per letter: «ts: ch, s» ⇄ { "ts": ["ch", "s"] }. */
export function formatConfusable(record?: Record<string, string[]>): string {
  return Object.entries(record ?? {})
    .map(([letter, list]) => `${letter}: ${list.join(", ")}`)
    .join("\n");
}

export function parseConfusable(
  text: string,
): TextParse<Record<string, string[]>> {
  const value: Record<string, string[]> = {};
  for (const line of splitLines(text)) {
    const [letter, list, ...rest] = line.split(":").map((part) => part.trim());
    const items = splitCommas(list ?? "");
    if (!letter || items.length === 0 || rest.length > 0) {
      return {
        ok: false,
        reason: `«${line}» no se entiende: escribe una letra por línea, como «ts: ch, s».`,
      };
    }
    value[letter] = items;
  }
  return { ok: true, value };
}

export function updateAlphabetMaps(
  bundle: LanguageBundle,
  maps: {
    vowelVariants?: Record<string, string>;
    confusable?: Record<string, string[]>;
  },
): LanguageBundle {
  const alphabet = { ...bundle.alphabet };
  for (const key of ["vowelVariants", "confusable"] as const) {
    if (!(key in maps)) continue;
    const value = maps[key];
    if (value && Object.keys(value).length > 0) {
      (alphabet as Record<string, unknown>)[key] = value;
    } else {
      delete alphabet[key];
    }
  }
  return { ...bundle, alphabet };
}

// ─── Sources ──────────────────────────────────────────────────────────────

export type SourceUsage = {
  entries: number;
  examples: number;
  alphabet: boolean;
};

export function sourceUsage(bundle: LanguageBundle, id: string): SourceUsage {
  let entries = 0;
  let examples = 0;
  for (const entry of bundle.entries) {
    if (entry.sourceId === id) entries += 1;
    examples += (entry.examples ?? []).filter(
      (example) => example.sourceId === id,
    ).length;
  }
  return { entries, examples, alphabet: bundle.alphabet.sourceId === id };
}

export type SourceFields = {
  kind: BundleSource["kind"];
  title: string;
  publisher: string;
  year: string;
  authors: string;
  url: string;
  license: string;
  note: string;
};

export type SourceFieldErrors = Partial<
  Record<"title" | "year" | "url", string>
>;

export const EMPTY_SOURCE_FIELDS: SourceFields = {
  kind: "publication",
  title: "",
  publisher: "",
  year: "",
  authors: "",
  url: "",
  license: "",
  note: "",
};

export function sourceToFields(source: BundleSource): SourceFields {
  return {
    kind: source.kind,
    title: source.title,
    publisher: source.publisher ?? "",
    year: source.year !== undefined ? String(source.year) : "",
    authors: (source.authors ?? []).join(", "),
    url: source.url ?? "",
    license: source.license ?? "",
    note: source.note ?? "",
  };
}

export function checkSourceFields(fields: SourceFields): SourceFieldErrors {
  const errors: SourceFieldErrors = {};
  if (!fields.title.trim()) errors.title = "Escribe el título de la fuente.";
  if (fields.year.trim() && !/^-?\d+$/.test(fields.year.trim())) {
    errors.year = "El año es un número entero.";
  }
  if (fields.url.trim() && !/^https?:\/\//.test(fields.url.trim())) {
    errors.url = "El enlace empieza con http:// o https://.";
  }
  return errors;
}

function fieldsToSource(id: string, fields: SourceFields): BundleSource {
  const authors = splitCommas(fields.authors);
  const source: BundleSource = {
    id,
    kind: fields.kind,
    title: fields.title.trim(),
  };
  const optional = {
    publisher: fields.publisher.trim(),
    url: fields.url.trim(),
    license: fields.license.trim(),
    note: fields.note.trim(),
  };
  for (const [key, value] of Object.entries(optional)) {
    if (value) (source as Record<string, unknown>)[key] = value;
  }
  if (fields.year.trim()) source.year = Number.parseInt(fields.year.trim(), 10);
  if (authors.length > 0) source.authors = authors;
  return source;
}

export function addSource(
  bundle: LanguageBundle,
  fields: SourceFields,
): { bundle: LanguageBundle; id: string } {
  const id = uniqueId(
    fields.title,
    bundle.sources.map((source) => source.id),
    "fuente",
  );
  return {
    id,
    bundle: {
      ...bundle,
      sources: [...bundle.sources, fieldsToSource(id, fields)],
    },
  };
}

export function updateSource(
  bundle: LanguageBundle,
  id: string,
  fields: SourceFields,
): LanguageBundle {
  return {
    ...bundle,
    sources: bundle.sources.map((source) =>
      source.id === id ? fieldsToSource(id, fields) : source,
    ),
  };
}

/** A cited source cannot go: the words that cite it would lose their origin. */
export function removeSource(bundle: LanguageBundle, id: string): EditResult {
  const usage = sourceUsage(bundle, id);
  const reasons = [
    usage.entries > 0
      ? `${usage.entries} palabra${usage.entries === 1 ? "" : "s"}`
      : "",
    usage.examples > 0
      ? `${usage.examples} ejemplo${usage.examples === 1 ? "" : "s"}`
      : "",
    usage.alphabet ? "el alfabeto" : "",
  ].filter(Boolean);
  if (reasons.length > 0) {
    return failed(`No se puede quitar: la citan ${reasons.join(", ")}.`);
  }
  if (bundle.sources.length === 1) {
    return failed("El paquete necesita al menos una fuente.");
  }
  return {
    ok: true,
    bundle: {
      ...bundle,
      sources: bundle.sources.filter((source) => source.id !== id),
    },
  };
}
