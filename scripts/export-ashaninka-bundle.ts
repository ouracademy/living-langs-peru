#!/usr/bin/env node
// Writes the Asháninka language bundle (language-bundle/1, specs/gestor-lenguas.md)
// from what the repo already has: the MINEDU 2021 dictionary, its official
// alphabet and the reviewed emoji list. It adds and drops no word.
//
// Words are marked verified because the team decided the official, cited
// MINEDU vocabulary counts as verification (2026-11-20). Run it again only
// to regenerate the file; it overwrites src/data/bundles/ashaninka.json.
//
// Usage: node --experimental-strip-types scripts/export-ashaninka-bundle.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ASHANINKA_ALPHABET } from "../src/lib/dictionary/collation.ts";
import type { Dictionary, Source } from "../src/lib/dictionary/types.ts";

const root = process.cwd();
const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(join(root, path), "utf8"));

const dictionary = readJson("src/data/dictionary/ashaninka.json") as Dictionary;
const { sources } = readJson("src/data/dictionary/sources.json") as {
  sources: Source[];
};
const { pictures } = readJson("src/data/word-jump/ashaninka-pictures.json") as {
  pictures: { id: string; emoji: string }[];
};

const emojiById = new Map(
  pictures.map((picture) => [picture.id, picture.emoji]),
);
const usedSources = new Set(
  dictionary.entries.flatMap((entry) =>
    entry.sourceId ? [entry.sourceId] : [],
  ),
);
const mainSource = sources.find((source) => usedSources.has(source.id));
if (!mainSource)
  throw new Error("No source cited by the dictionary was found.");

const entries = dictionary.entries.map((entry) => {
  const emoji = emojiById.get(entry.id);
  return {
    id: entry.id,
    word: entry.word,
    ...(entry.variants?.length ? { variants: entry.variants } : {}),
    translations: entry.translations,
    ...(entry.partOfSpeech ? { partOfSpeech: entry.partOfSpeech } : {}),
    ...(entry.examples.length
      ? {
          examples: entry.examples.map((example) => ({
            sentence: example.sentence,
            translation: example.translation,
            ...(example.sourceId && example.sourceId !== entry.sourceId
              ? { sourceId: example.sourceId }
              : {}),
          })),
        }
      : {}),
    ...(entry.notes ? { notes: entry.notes } : {}),
    ...(emoji ? { emoji } : {}),
    sourceId: entry.sourceId ?? mainSource.id,
    sourceRef: `entrada «${entry.word}»`,
    verified: true,
    verifiedBy: `Fuente oficial: ${mainSource.title} (${mainSource.year})`,
  };
});

const pictured = entries
  .filter((entry) => entry.emoji)
  .map((entry) => entry.id);
const all = entries.map((entry) => entry.id);

const bundle = {
  $schema: "../../../docs/gestor-lenguas/language-bundle.schema.json",
  schema: "language-bundle/1",
  language: "ashaninka",
  translationLabel: "castellano",
  alphabet: {
    graphemes: [...ASHANINKA_ALPHABET],
    vowels: ["a", "e", "i", "o"],
    sourceId: mainSource.id,
  },
  speech: { lang: "es-PE", quality: "approx" },
  sources: sources
    .filter((source) => usedSources.has(source.id))
    .map((source) => ({
      id: source.id,
      kind: "publication",
      title: source.title,
      publisher: source.publisher,
      year: source.year,
      ...(source.authors ? { authors: source.authors } : {}),
      url: source.url,
      ...(source.note ? { note: source.note } : {}),
    })),
  entries,
  themes: [
    {
      id: "dibujo-palabra",
      name: "Dibujo → palabra",
      icon: "🖼️",
      mode: "pic2word",
      entryIds: pictured,
    },
    {
      id: "palabra-dibujo",
      name: "Palabra → dibujo",
      icon: "🔎",
      mode: "word2pic",
      entryIds: pictured,
    },
    {
      id: "letra-inicial",
      name: "Letra inicial",
      icon: "🔤",
      mode: "first",
      entryIds: all,
    },
    {
      id: "vocal-que-falta",
      name: "Vocal que falta",
      icon: "🅰️",
      mode: "vowel",
      entryIds: all,
    },
  ],
};

mkdirSync(join(root, "src/data/bundles"), { recursive: true });
const output = join(root, "src/data/bundles/ashaninka.json");
writeFileSync(output, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
console.log(
  `export-ashaninka-bundle: ${entries.length} entradas (${pictured.length} con emoji), ${bundle.themes.length} temas → src/data/bundles/ashaninka.json`,
);
