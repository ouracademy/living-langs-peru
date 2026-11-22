import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseBundle } from "@/lib/language-bundles/schema";

import { testBundle } from "./fixtures";

const root = process.cwd();
const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(join(root, path), "utf8"));

const jsonSchema = readJson(
  "docs/gestor-lenguas/language-bundle.schema.json",
) as object;

/**
 * The JSON Schema is the normative reference (spec §4.1). ajv comes in with
 * ESLint as a transitive dependency; it is loaded by path, only here, so the
 * test adds no dependency to the project.
 */
type AjvInstance = { validate: (schema: object, data: unknown) => boolean };
function loadAjv(): AjvInstance {
  const store = join(root, "node_modules/.pnpm");
  const folder = readdirSync(store)
    .filter((name) => name.startsWith("ajv@"))
    .sort()[0];
  const Ajv = createRequire(import.meta.url)(
    join(store, folder, "node_modules/ajv"),
  ) as new (options: object) => AjvInstance;
  return new Ajv({ allErrors: true });
}
const ajv = loadAjv();
const schemaAccepts = (data: unknown) => ajv.validate(jsonSchema, data);

const example = readJson("src/data/bundles/ashaninka.json");
const template = readJson("docs/gestor-lenguas/plantilla-uro.json");

/** Documents both validators must refuse (AC-L1-1). */
const invalid: [string, unknown][] = [
  ["another schema version", { ...testBundle(), schema: "language-bundle/2" }],
  ["a third language", { ...testBundle(), language: "aimara" }],
  ["an unknown top-level field", { ...testBundle(), extra: true }],
  [
    "an entry without a source",
    {
      ...testBundle(),
      entries: [
        { id: "prueba", word: "pato", translations: ["x"], verified: true },
      ],
    },
  ],
  [
    "an entry without translations",
    {
      ...testBundle(),
      entries: [{ ...testBundle().entries[0], translations: [] }],
    },
  ],
  [
    "an id with capitals",
    {
      ...testBundle(),
      entries: [{ ...testBundle().entries[0], id: "Prueba" }],
    },
  ],
  [
    "a repeated grapheme",
    {
      ...testBundle(),
      alphabet: { ...testBundle().alphabet, graphemes: ["a", "a"] },
    },
  ],
  [
    "a theme with no entries",
    {
      ...testBundle(),
      themes: [{ ...testBundle().themes[0], entryIds: [] }],
    },
  ],
  [
    "an unknown game mode",
    {
      ...testBundle(),
      themes: [{ ...testBundle().themes[0], mode: "memory" }],
    },
  ],
  [
    "a source URL without a scheme",
    {
      ...testBundle(),
      sources: [{ ...testBundle().sources[0], url: "example.org" }],
    },
  ],
  [
    "an audio URL over http",
    {
      ...testBundle(),
      entries: [{ ...testBundle().entries[0], audio: "http://x.org/a.mp3" }],
    },
  ],
  ["no sources at all", { ...testBundle(), sources: [] }],
];

describe("parseBundle", () => {
  it("accepts the asháninka example and the uro template, like the JSON Schema", () => {
    for (const document of [example, template]) {
      expect(schemaAccepts(document)).toBe(true);
      expect(parseBundle(document).ok).toBe(true);
    }
  });

  it("accepts a valid bundle and drops $schema", () => {
    const parsed = parseBundle({ $schema: "./x.json", ...testBundle() });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect("$schema" in parsed.bundle).toBe(false);
  });

  it.each(invalid)("refuses %s, like the JSON Schema", (_name, document) => {
    expect(schemaAccepts(document)).toBe(false);
    const parsed = parseBundle(document);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.issues.length).toBeGreaterThan(0);
  });

  it("uses only words marked PRUEBA in the template", () => {
    const words = (template as { entries: { word: string }[] }).entries.map(
      (entry) => entry.word,
    );
    expect(words.every((word) => word.includes("PRUEBA"))).toBe(true);
  });
});
