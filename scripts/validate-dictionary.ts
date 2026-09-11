import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { validateDictionary } from "../src/lib/dictionary/validate.ts";

const DATA_DIR = join(process.cwd(), "src/data/dictionary");
const SKIP = new Set(["sources.json"]);

function main(): void {
  const files = readdirSync(DATA_DIR)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !SKIP.has(name));

  if (files.length === 0) {
    console.error(`No hay archivos de diccionario en ${DATA_DIR}`);
    process.exit(1);
  }

  let failed = false;

  for (const file of files) {
    const path = join(DATA_DIR, file);
    let problems: string[];

    try {
      problems = validateDictionary(JSON.parse(readFileSync(path, "utf8")));
    } catch (error) {
      problems = [`JSON inválido: ${(error as Error).message}`];
    }

    if (problems.length === 0) {
      console.log(`✓ ${file}`);
      continue;
    }

    failed = true;
    console.error(`✗ ${file} — ${problems.length} problema(s):`);
    for (const problem of problems) console.error(`    ${problem}`);
  }

  process.exit(failed ? 1 : 0);
}

main();
