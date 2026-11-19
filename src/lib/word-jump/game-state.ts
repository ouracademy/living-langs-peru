import { playableThemes, previewThemes } from "../language-packs/playable.ts";
import type {
  LanguagePack,
  PackReadResult,
  PackSource,
  Theme,
} from "../language-packs/types.ts";

/**
 * The part of a pack that is sent to the browser: playable themes only, and
 * the sources they cite. Nothing unverified is in here (decision #4).
 */
export type PublicPack = {
  language: Pick<
    LanguagePack["language"],
    | "slug"
    | "isoCode"
    | "name"
    | "title"
    | "translationLabel"
    | "praise"
    // The letter modes (first, vowel) build their questions from these.
    | "graphemes"
    | "vowels"
    | "vowelVariants"
    | "confusable"
  >;
  sources: PackSource[];
  themes: Theme[];
  version: number;
};

export type GameState =
  /** No configuration: the game cannot be read at all (AC-SP4-8). */
  | { kind: "unavailable" }
  /** Readable, but nothing playable is published yet. */
  | { kind: "empty" }
  | { kind: "ready"; pack: PublicPack };

/** The browser's share of a pack, given the themes already chosen for it. */
function toPublicPack(
  pack: LanguagePack,
  themes: Theme[],
  version: number,
): PublicPack {
  const cited = new Set(
    themes.flatMap((theme) => theme.items.map((item) => item.sourceId)),
  );
  const {
    slug,
    isoCode,
    name,
    title,
    translationLabel,
    praise,
    graphemes,
    vowels,
    vowelVariants,
    confusable,
  } = pack.language;

  return {
    language: {
      slug,
      isoCode,
      name,
      title,
      translationLabel,
      graphemes,
      vowels,
      ...(praise ? { praise } : {}),
      ...(vowelVariants ? { vowelVariants } : {}),
      ...(confusable ? { confusable } : {}),
    },
    sources: pack.sources.filter((source) => cited.has(source.id)),
    themes,
    version,
  };
}

/** What the game page shows for a read result. Pure, so it is tested alone. */
export function resolveGameState(result: PackReadResult): GameState {
  if (result.status === "unconfigured") return { kind: "unavailable" };
  if (result.status === "none") return { kind: "empty" };

  const themes = playableThemes(result.pack);
  if (themes.length === 0) return { kind: "empty" };

  return {
    kind: "ready",
    pack: toPublicPack(result.pack, themes, result.version),
  };
}

/**
 * The pack «Probar» plays in /admin/juego (AC-SP6-10): unverified items
 * included, so they can be reviewed. `null` when no theme reaches its minimum.
 * Version 0: it is not published.
 */
export function previewPack(pack: LanguagePack): PublicPack | null {
  const themes = previewThemes(pack);
  return themes.length === 0 ? null : toPublicPack(pack, themes, 0);
}
