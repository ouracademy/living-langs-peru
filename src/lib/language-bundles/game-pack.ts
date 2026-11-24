import "server-only";

import { getLanguageCode } from "@/lib/dictionary";
import type { PackReadResult } from "@/lib/language-packs/types";
import { getLanguage } from "@/lib/languages";
import { type GalleryPhase, galleryPhase } from "@/lib/peoples/gallery-photos";

import { bundleToPack } from "./adapters.ts";
import { getLanguageBundle } from "./library.ts";
import type { BundleReadResult } from "./types.ts";

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
 * What Saltapalabras plays for `language`: its language bundle, published in
 * Supabase or, failing that, the repo's (spec gestor-lenguas #5, #6). The game
 * engine plays a `LanguagePack`, which the adapter builds from the bundle. A
 * language with no bundle has nothing to play.
 */
export async function getGamePack(
  language: string,
  phase: GalleryPhase = galleryPhase(),
): Promise<PackReadResult> {
  const bundle = await getLanguageBundle(language, phase);
  return bundle.status === "ok"
    ? fromBundle(language, bundle)
    : { status: "none" };
}
