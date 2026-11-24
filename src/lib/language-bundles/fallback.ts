import ashaninka from "@/data/bundles/ashaninka.json";

import { parseBundle } from "./schema.ts";
import type { BundleLanguage, LanguageBundle } from "./types.ts";

/**
 * The bundles that live in the repo (spec decision #6): what the site shows
 * when Supabase has nothing published, is not configured, or cannot be read
 * during a build. Asháninka has its current content; uro has none.
 */
const REPO_BUNDLES: Partial<Record<BundleLanguage, unknown>> = { ashaninka };

const parsed = new Map<string, LanguageBundle | null>();

/** The repo's bundle of `language`, or null when there is none. */
export function repoBundle(language: string): LanguageBundle | null {
  const cached = parsed.get(language);
  if (cached !== undefined) return cached;

  const raw = (REPO_BUNDLES as Record<string, unknown>)[language];
  const result = raw === undefined ? null : parseBundle(raw);
  if (result && !result.ok) {
    // A broken fallback is a bug in the repo, not a state to hide.
    throw new Error(
      `repo bundle «${language}» is invalid: ${result.issues[0]}`,
    );
  }
  const bundle = result ? result.bundle : null;
  parsed.set(language, bundle);
  return bundle;
}
