import type { Dictionary, Entry, Source } from "../dictionary/types.ts";
import type {
  LanguagePack,
  PackItem,
  PackSource,
  Theme,
} from "../language-packs/types.ts";
import { PACK_SCHEMA } from "../language-packs/types.ts";

import type { BundleEntry, BundleSource, LanguageBundle } from "./types.ts";

// The dictionary and both games already consume `Dictionary` and
// `LanguagePack`. Translating a bundle into those shapes (plan §2.1) keeps
// their code unchanged: only where the content comes from changes.

/** Only verified entries ever reach a public page (spec decision #8). */
export function verifiedEntries(bundle: LanguageBundle): BundleEntry[] {
  return bundle.entries.filter((entry) => entry.verified);
}

function toDictionarySource(source: BundleSource): Source {
  return {
    id: source.id,
    title: source.title,
    ...(source.publisher ? { publisher: source.publisher } : {}),
    ...(source.year !== undefined ? { year: source.year } : {}),
    ...(source.authors ? { authors: source.authors } : {}),
    ...(source.url ? { url: source.url } : {}),
    ...(source.note ? { note: source.note } : {}),
  };
}

function toDictionaryEntry(entry: BundleEntry): Entry {
  return {
    id: entry.id,
    word: entry.word,
    ...(entry.variants?.length ? { variants: entry.variants } : {}),
    translations: entry.translations,
    ...(entry.partOfSpeech ? { partOfSpeech: entry.partOfSpeech } : {}),
    examples: (entry.examples ?? []).map((example) => ({
      sentence: example.sentence,
      translation: example.translation,
      ...(example.sourceId ? { sourceId: example.sourceId } : {}),
    })),
    ...(entry.notes ? { notes: entry.notes } : {}),
    sourceId: entry.sourceId,
  };
}

export type DictionaryContent = {
  dictionary: Dictionary;
  sources: Source[];
  /** The bundle's graphemes, in order: they sort and group the entries. */
  alphabet: string[];
};

/** The dictionary's view of a bundle: verified entries and their sources. */
export function bundleToDictionary(bundle: LanguageBundle): DictionaryContent {
  const entries = verifiedEntries(bundle).map(toDictionaryEntry);
  const cited = new Set(
    entries.flatMap((entry) => [
      entry.sourceId,
      ...entry.examples.map((example) => example.sourceId),
    ]),
  );
  return {
    dictionary: { language: bundle.language, entries },
    sources: bundle.sources
      .filter((source) => cited.has(source.id))
      .map(toDictionarySource),
    alphabet: bundle.alphabet.graphemes,
  };
}

function toPackItem(entry: BundleEntry): PackItem {
  return {
    id: entry.id,
    word: entry.word,
    translation: entry.translations[0],
    ...(entry.emoji ? { emoji: entry.emoji } : {}),
    sourceId: entry.sourceId,
    ...(entry.sourceRef ? { sourceRef: entry.sourceRef } : {}),
    verified: entry.verified,
    ...(entry.audio ? { audio: entry.audio } : {}),
  };
}

function toPackSource(source: BundleSource): PackSource {
  return {
    id: source.id,
    kind: source.kind,
    title: source.title,
    ...(source.url ? { url: source.url } : {}),
    ...(source.note ? { note: source.note } : {}),
  };
}

export type PackIdentity = {
  /** Shown as the language's name: «Asháninka». */
  name: string;
  /** ISO 639-3 for the `lang` attribute; empty when not confirmed. */
  isoCode: string;
};

/**
 * Saltapalabras' view of a bundle. Themes resolve their entry ids here, and
 * unverified entries stay in so that `playableThemes` (the one gate between a
 * pack and a player) and «Probar» work exactly as with a pack.
 */
export function bundleToPack(
  bundle: LanguageBundle,
  identity: PackIdentity,
): LanguagePack {
  const byId = new Map(bundle.entries.map((entry) => [entry.id, entry]));
  const themes: Theme[] = bundle.themes.map((theme) => ({
    id: theme.id,
    name: theme.name,
    icon: theme.icon,
    mode: theme.mode,
    items: theme.entryIds.flatMap((id) => {
      const entry = byId.get(id);
      return entry ? [toPackItem(entry)] : [];
    }),
  }));
  const { alphabet, speech } = bundle;

  return {
    schema: PACK_SCHEMA,
    language: {
      slug: bundle.language,
      isoCode: identity.isoCode,
      name: identity.name,
      title: `Saltapalabras en ${identity.name.toLowerCase()}`,
      vowels: alphabet.vowels,
      graphemes: alphabet.graphemes,
      translationLabel: bundle.translationLabel,
      ...(alphabet.vowelVariants
        ? { vowelVariants: alphabet.vowelVariants }
        : {}),
      ...(alphabet.confusable ? { confusable: alphabet.confusable } : {}),
      ...(speech ? { tts: speech } : {}),
    },
    sources: bundle.sources.map(toPackSource),
    themes,
  };
}
