import { buildItems } from "../src/lib/game/items.ts";
import { describePool, validatePool } from "../src/lib/game/validate.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Dictionary } from "../src/lib/dictionary/types.ts";

// Read from disk rather than through src/lib/dictionary, whose static JSON
// imports need a bundler. The data files are the same ones.
const DATA_DIR = join(process.cwd(), "src/data/dictionary");
const LANGUAGES = ["ashaninka"];

function main(): void {
  const dump = process.argv.includes("--dump");
  let failed = false;

  for (const language of LANGUAGES) {
    const path = join(DATA_DIR, `${language}.json`);
    const dictionary = JSON.parse(readFileSync(path, "utf8")) as Dictionary;
    const items = buildItems(dictionary.entries);
    const problems = validatePool(items, language);

    if (dump) {
      console.log(describePool(items));
      console.log();
    }

    if (problems.length === 0) {
      console.log(`✓ ${language} — ${items.length} ítems`);
      continue;
    }

    failed = true;
    console.error(`✗ ${language} — ${problems.length} problema(s):`);
    for (const problem of problems) console.error(`    ${problem}`);
  }

  process.exit(failed ? 1 : 0);
}

main();
