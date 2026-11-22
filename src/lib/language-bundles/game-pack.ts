import "server-only";

import { getLanguageCode } from "@/lib/dictionary";
import { getPublishedPack } from "@/lib/language-packs/library";
import type { PackReadResult } from "@/lib/language-packs/types";
import { getLanguage } from "@/lib/languages";
import { type GalleryPhase, galleryPhase } from "@/lib/peoples/gallery-photos";

import { bundleToPack } from "./adapters.ts";
import { getLanguageBundle } from "./library.ts";
import type { BundleReadResult } from "./types.ts";

/**
 * The pack still published from /admin/juego, until it is retired (plan
 * §2.4). Its read failing is handled like the bundle's: it throws in
 * production and is skipped during a build or in dev.
 */
async function readLegacyPack(
  language: string,
  phase: GalleryPhase,
): Promise<PackReadResult | null> {
  try {
    const result = await getPublishedPack(language);
    return result.status === "ok" ? result : null;
  } catch (error) {
    if (phase === "production") throw error;
    return null;
  }
}

function fromBundle(
  language: string,
  read: Extract<BundleReadResult, { status: "ok" }>,
): PackReadResult {
  return {
    status: "ok",
    pack: bundleToPack(read.bundle, {
      name: getLanguage(language)?.name ?? language,
      isoCode: getLanguageCode(language) ?? "",
    }),
    version: read.version,
    publishedAt: read.publishedAt ?? "",
  };
}

/**
 * What Saltapalabras plays for `language` (plan §2.4), in order: the language
 * bundle published in Supabase, the pack published from /admin/juego, the
 * repo's bundle. A language with none of them has nothing to play.
 */
export async function getGamePack(
  language: string,
  phase: GalleryPhase = galleryPhase(),
): Promise<PackReadResult> {
  const bundle = await getLanguageBundle(language, phase);
  if (bundle.status === "ok" && bundle.origin === "supabase") {
    return fromBundle(language, bundle);
  }

  const legacy = await readLegacyPack(language, phase);
  if (legacy) return legacy;

  return bundle.status === "ok"
    ? fromBundle(language, bundle)
    : { status: "none" };
}
