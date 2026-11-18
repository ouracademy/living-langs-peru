import { z } from "zod";

import { GAME_MODES, PACK_SCHEMA, type LanguagePack } from "./types.ts";

const itemSchema = z.object({
  // Optional on input: cleanPack gives an id to items that have none.
  id: z.string().default(""),
  word: z.string(),
  translation: z.string(),
  emoji: z.string().optional(),
  sourceId: z.string().optional(),
  sourceRef: z.string().optional(),
  // Missing means not checked by anyone: never played (decision #4).
  verified: z.boolean().default(false),
  audio: z.string().optional(),
});

const themeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  nameNative: z.string().optional(),
  icon: z.string(),
  mode: z.enum(GAME_MODES),
  items: z.array(itemSchema),
});

const sourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["publication", "speaker"]),
  title: z.string().min(1),
  url: z.string().optional(),
  note: z.string().optional(),
});

const packSchema = z.object({
  schema: z.literal(PACK_SCHEMA),
  language: z.object({
    slug: z.string().min(1),
    isoCode: z.string().min(1),
    name: z.string().min(1),
    title: z.string(),
    about: z
      .object({
        region: z.string().optional(),
        family: z.string().optional(),
        speakers: z.string().optional(),
        notes: z.string().optional(),
      })
      .optional(),
    vowels: z.array(z.string()),
    vowelVariants: z.record(z.string(), z.string()).optional(),
    graphemes: z.array(z.string()),
    confusable: z.record(z.string(), z.array(z.string())).optional(),
    translationLabel: z.string(),
    praise: z
      .object({
        correct: z.string().optional(),
        wrong: z.string().optional(),
        win: z.string().optional(),
      })
      .optional(),
  }),
  sources: z.array(sourceSchema),
  themes: z.array(themeSchema),
});

export type ParsePackResult =
  { ok: true; pack: LanguagePack } | { ok: false; issues: string[] };

/**
 * The only way into a LanguagePack from outside: the database, an imported
 * file, localStorage. What does not validate is rejected whole; nothing is
 * repaired halfway (spec §4.2).
 */
export function parsePack(input: unknown): ParsePackResult {
  const result = packSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "(raíz)"}: ${issue.message}`,
      ),
    };
  }

  return { ok: true, pack: result.data };
}
