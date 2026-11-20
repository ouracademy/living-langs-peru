#!/usr/bin/env node
// Writes an Asháninka pack for Saltapalabras from the cited dictionary (MINEDU
// 2021 vocabulary + official alphabet) and src/data/word-jump/ashaninka-pictures.json.
// Words come out unverified unless --verificado records the team's decision.
// Never overwrites an existing file: a reviewed draft is someone's work.
//
// Usage: node --experimental-strip-types scripts/draft-pack-from-dictionary.ts
//          [archivo.json] [--verificado]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Dictionary, Source } from "../src/lib/dictionary/types.ts";
import {
  draftAshaninkaPack,
  type EntryPicture,
} from "../src/lib/language-packs/from-dictionary.ts";
import { validatePack } from "../src/lib/language-packs/validate.ts";

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));

const args = process.argv.slice(2);
const verified = args.includes("--verificado");
const output =
  args.find((arg) => !arg.startsWith("--")) ??
  (verified
    ? "paquete-ashaninka-verificado.json"
    : "paquete-ashaninka-borrador.json");

if (existsSync(output)) {
  console.error(
    `draft-pack: ${output} ya existe y no se sobrescribe. Renómbralo, bórralo o pasa otro nombre.`,
  );
  process.exit(2);
}

const dictionary = readJson("src/data/dictionary/ashaninka.json") as Dictionary;
const { sources } = readJson("src/data/dictionary/sources.json") as {
  sources: Source[];
};
const { pictures } = readJson("src/data/word-jump/ashaninka-pictures.json") as {
  pictures: EntryPicture[];
};

const pack = draftAshaninkaPack(dictionary, sources, { pictures, verified });
// The pack carries no audio, so the bucket URL is never checked against.
const { errors, warnings } = validatePack(pack, {
  language: "ashaninka",
  audioBaseUrl: "https://example.invalid/storage/v1/object/public/audio",
});
writeFileSync(output, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

for (const theme of pack.themes) {
  console.log(`  ${theme.name}: ${theme.items.length} palabras`);
}
console.log(
  `draft-pack: ${output} · ${verified ? "todas verificadas" : "ninguna verificada"} · ${errors.length} errores · ${warnings.length} avisos`,
);
console.log(
  "  Súbelo en /admin/juego (Importar → Probar → Publicar). No lo agregues al repo.",
);
if (errors.length > 0) process.exit(1);
