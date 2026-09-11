import ashaninka from "@/data/dictionary/ashaninka.json";
import sourcesData from "@/data/dictionary/sources.json";
import type { LanguageSlug } from "@/lib/languages";

import type { Dictionary, Source } from "./types";

/**
 * Static imports rather than `fs`, so the same code path works in Server
 * Components and Route Handlers with no filesystem access at runtime.
 *
 * TypeScript widens string literals when importing JSON, so the shape cannot
 * be checked structurally here. The `dictionary:check` script is the guard
 * that keeps these files honest.
 */
export const dictionaries: Partial<Record<LanguageSlug, Dictionary>> = {
  ashaninka: ashaninka as Dictionary,
};

/** Cited works the entries come from. Keyed by the `sourceId` on each entry. */
export const sources: Source[] = sourcesData.sources as Source[];
