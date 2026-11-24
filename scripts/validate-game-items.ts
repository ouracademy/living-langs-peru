import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { buildItems } from "../src/lib/game/items.ts";
import { describePool, validatePool } from "../src/lib/game/validate.ts";
import { bundleToDictionary } from "../src/lib/language-bundles/adapters.ts";
import { parseBundle } from "../src/lib/language-bundles/schema.ts";

// «Completar palabras» plays the verified entries with examples of each
// language bundle (spec gestor-lenguas §6.2). Read from disk rather than
// through the cached library, which needs Next.
const DATA_DIR = join(process.cwd(), "src/data/bundles");

function main(): void {
  const dump = process.argv.includes("--dump");
  let failed = false;

  const files = readdirSync(DATA_DIR).filter((name) => name.endsWith(".json"));
  for (const file of files) {
    const language = basename(file, ".json");
    const parsed = parseBundle(
      JSON.parse(readFileSync(join(DATA_DIR, file), "utf8")),
    );
    if (!parsed.ok) {
      failed = true;
      console.error(
        `✗ ${language} — no es un paquete válido (ver bundles:check)`,
      );
      continue;
    }

    const { dictionary } = bundleToDictionary(parsed.bundle);
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
