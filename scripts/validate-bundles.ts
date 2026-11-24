#!/usr/bin/env node
// Validates the language bundles kept in the repo (src/data/bundles/*.json)
// with the same rules as /admin/lenguas: parseBundle for the shape, then
// validateBundle. Errors fail; warnings are counted, not fatal, as in the
// admin (spec gestor-lenguas §4.2). Replaces dictionary:check (F4).
//
// Usage: node --experimental-strip-types scripts/validate-bundles.ts
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { parseBundle } from "../src/lib/language-bundles/schema.ts";
import { validateBundle } from "../src/lib/language-bundles/validate.ts";

const DATA_DIR = join(process.cwd(), "src/data/bundles");

function check(file: string): boolean {
  const language = basename(file, ".json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
  } catch (error) {
    console.error(`✗ ${language} — JSON inválido: ${(error as Error).message}`);
    return false;
  }

  const parsed = parseBundle(raw);
  if (!parsed.ok) {
    console.error(`✗ ${language} — no tiene la forma de language-bundle/1:`);
    for (const issue of parsed.issues) console.error(`    ${issue}`);
    return false;
  }

  // Bundles in the repo carry no audio: no bucket URL to check against.
  const { errors, warnings } = validateBundle(parsed.bundle, { language });
  if (errors.length > 0) {
    console.error(`✗ ${language} — ${errors.length} error(es):`);
    for (const issue of errors) console.error(`    ${issue.message}`);
    return false;
  }

  console.log(
    `✓ ${language} — ${parsed.bundle.entries.length} entradas, ${parsed.bundle.themes.length} temas, ${warnings.length} aviso(s)`,
  );
  return true;
}

function main(): void {
  const files = readdirSync(DATA_DIR).filter((name) => name.endsWith(".json"));
  if (files.length === 0) {
    console.error(`No hay paquetes de lengua en ${DATA_DIR}`);
    process.exit(1);
  }
  const results = files.map(check);
  process.exit(results.every(Boolean) ? 0 : 1);
}

main();
