#!/usr/bin/env node
// Writes a first Asháninka pack for Saltapalabras from the cited dictionary
// (MINEDU 2021 nouns + official alphabet). Every word comes out unverified:
// the team reviews it, marks what it verifies and publishes it at /admin/juego.
//
// Usage: node --experimental-strip-types scripts/draft-pack-from-dictionary.ts [output.json]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Dictionary, Source } from "../src/lib/dictionary/types.ts";
import { draftAshaninkaPack } from "../src/lib/language-packs/from-dictionary.ts";
import { validatePack } from "../src/lib/language-packs/validate.ts";

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));

const output = process.argv[2] ?? "paquete-ashaninka-borrador.json";
const dictionary = readJson("src/data/dictionary/ashaninka.json") as Dictionary;
const { sources } = readJson("src/data/dictionary/sources.json") as {
  sources: Source[];
};

const pack = draftAshaninkaPack(dictionary, sources);
// The draft carries no audio, so the bucket URL is never checked against.
const { errors, warnings } = validatePack(pack, {
  language: "ashaninka",
  audioBaseUrl: "https://example.invalid/storage/v1/object/public/audio",
});
writeFileSync(output, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

const words = pack.themes[0]?.items.length ?? 0;
console.log(`draft-pack: ${output} · ${words} palabras · 0 verificadas`);
console.log(
  `  ${errors.length} errores · ${warnings.length} avisos (los «sin verificar» son esperables)`,
);
console.log(
  "  Revísalo, cambia a true el «verified» de las palabras que el equipo verifique",
);
console.log("  y súbelo en /admin/juego. No lo agregues al repo.");
if (errors.length > 0) process.exit(1);
