import { playableThemes } from "../language-packs/playable.ts";
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
    "slug" | "isoCode" | "name" | "title" | "translationLabel" | "praise"
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

/** What the game page shows for a read result. Pure, so it is tested alone. */
export function resolveGameState(result: PackReadResult): GameState {
  if (result.status === "unconfigured") return { kind: "unavailable" };
  if (result.status === "none") return { kind: "empty" };

  const themes = playableThemes(result.pack);
  if (themes.length === 0) return { kind: "empty" };

  const cited = new Set(
    themes.flatMap((theme) => theme.items.map((item) => item.sourceId)),
  );
  const { slug, isoCode, name, title, translationLabel, praise } =
    result.pack.language;

  return {
    kind: "ready",
    pack: {
      language: {
        slug,
        isoCode,
        name,
        title,
        translationLabel,
        ...(praise ? { praise } : {}),
      },
      sources: result.pack.sources.filter((source) => cited.has(source.id)),
      themes,
      version: result.version,
    },
  };
}
