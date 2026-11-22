import { z } from "zod";

import {
  BUNDLE_LANGUAGES,
  BUNDLE_SCHEMA,
  PARTS_OF_SPEECH,
  THEME_MODES,
  type LanguageBundle,
} from "./types.ts";

// Mirrors docs/gestor-lenguas/language-bundle.schema.json, rule by rule:
// every object is strict (additionalProperties: false) and the patterns,
// minimums and uniqueness are the same. tests/unit/language-bundles checks
// both against the same valid and invalid documents.

const ID = /^[a-z0-9-]+$/;
const nonEmpty = z.string().min(1);

const uniqueStrings = (min: number) =>
  z
    .array(nonEmpty)
    .min(min)
    .refine((items) => new Set(items).size === items.length, {
      message: "items must be unique",
    });

const sourceSchema = z.strictObject({
  id: z.string().regex(ID),
  kind: z.enum(["publication", "speaker"]),
  title: nonEmpty,
  publisher: z.string().optional(),
  year: z.number().int().optional(),
  authors: z.array(z.string()).optional(),
  url: z
    .string()
    .regex(/^https?:\/\//)
    .optional(),
  license: z.string().optional(),
  note: z.string().optional(),
});

const exampleSchema = z.strictObject({
  sentence: nonEmpty,
  translation: nonEmpty,
  sourceId: z.string().optional(),
});

const entrySchema = z.strictObject({
  id: z.string().regex(ID),
  word: nonEmpty,
  variants: z.array(z.string()).optional(),
  translations: z.array(nonEmpty).min(1),
  partOfSpeech: z.enum(PARTS_OF_SPEECH).optional(),
  examples: z.array(exampleSchema).optional(),
  notes: z.string().optional(),
  emoji: z.string().optional(),
  audio: z
    .string()
    .regex(/^https:\/\//)
    .optional(),
  sourceId: z.string(),
  sourceRef: z.string().optional(),
  verified: z.boolean(),
  verifiedBy: z.string().optional(),
});

const themeSchema = z.strictObject({
  id: z.string().regex(ID),
  name: nonEmpty,
  icon: nonEmpty,
  mode: z.enum(THEME_MODES),
  entryIds: z
    .array(z.string())
    .min(1)
    .refine((items) => new Set(items).size === items.length, {
      message: "items must be unique",
    }),
});

const bundleSchema = z.strictObject({
  // Points the editor at the JSON Schema; the site ignores it.
  $schema: z.string().optional(),
  schema: z.literal(BUNDLE_SCHEMA),
  language: z.enum(BUNDLE_LANGUAGES),
  translationLabel: nonEmpty,
  alphabet: z.strictObject({
    graphemes: uniqueStrings(1),
    vowels: uniqueStrings(1),
    vowelVariants: z.record(z.string(), z.string()).optional(),
    confusable: z.record(z.string(), z.array(z.string())).optional(),
    sourceId: z.string().optional(),
  }),
  speech: z
    .strictObject({
      lang: z.string(),
      quality: z.enum(["approx", "off"]),
      replace: z.array(z.tuple([z.string(), z.string()])).optional(),
    })
    .optional(),
  sources: z.array(sourceSchema).min(1),
  entries: z.array(entrySchema),
  themes: z.array(themeSchema),
});

export type ParseBundleResult =
  { ok: true; bundle: LanguageBundle } | { ok: false; issues: string[] };

/**
 * Checks the shape of anything that claims to be a bundle (an uploaded file,
 * a database row, the repo fallback). The whole document is rejected when it
 * does not match: nothing is repaired halfway. `$schema` is dropped.
 */
export function parseBundle(input: unknown): ParseBundleResult {
  const parsed = bundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(raíz)"}: ${issue.message}`,
      ),
    };
  }
  const bundle: Record<string, unknown> & typeof parsed.data = {
    ...parsed.data,
  };
  delete bundle.$schema;
  return { ok: true, bundle: bundle as LanguageBundle };
}
