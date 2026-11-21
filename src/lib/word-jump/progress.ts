/**
 * Progress kept in the browser, and nowhere else (spec §7.4, decision #16).
 * Same rules as completar-palabras: what is read back is validated and thrown
 * away if it is not right, and a storage that refuses leaves the game
 * playable. Nothing stored identifies anybody.
 */
import { canPersist, defaultStorage } from "../game/progress.ts";
import type { RoundOutcome } from "./round.ts";
import { type ItemStats, type LanguageProgress, recordRound } from "./stats.ts";

/** Version in the key as well as in the value: a new schema writes elsewhere. */
export const STORAGE_KEY = "living-langs:word-jump:v1";

const VERSION = 1;

export type WordJumpSettings = {
  sound: boolean;
  /**
   * «Voz aproximada» (spec §7.7). Optional so progress saved before
   * 2026-11-21 stays valid; missing reads as on.
   */
  voice?: boolean;
  /** «Decir la palabra al acercarse» (spec §7.7). Missing reads as on. */
  announce?: boolean;
};

export type WordJumpProgress = {
  version: typeof VERSION;
  languages: Record<string, LanguageProgress>;
  settings: WordJumpSettings;
};

/** A setting the player can turn on and off, with its default (on). */
export type ToggleSetting = keyof WordJumpSettings;

export function settingOn(
  settings: WordJumpSettings,
  key: ToggleSetting,
): boolean {
  return settings[key] ?? true;
}

export function emptyProgress(): WordJumpProgress {
  return { version: VERSION, languages: {}, settings: { sound: true } };
}

function isCount(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isItemStats(value: unknown): value is ItemStats {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    isCount(candidate.seen) &&
    isCount(candidate.correctFirstTry) &&
    isCount(candidate.missed) &&
    typeof candidate.lastSeenAt === "string"
  );
}

function isLanguageProgress(value: unknown): value is LanguageProgress {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(isItemStats)
  );
}

function isProgress(value: unknown): value is WordJumpProgress {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const settings = candidate.settings as Record<string, unknown> | undefined;

  return (
    candidate.version === VERSION &&
    typeof candidate.languages === "object" &&
    candidate.languages !== null &&
    Object.values(candidate.languages).every(isLanguageProgress) &&
    typeof settings === "object" &&
    settings !== null &&
    typeof settings.sound === "boolean" &&
    isOptionalFlag(settings.voice) &&
    isOptionalFlag(settings.announce)
  );
}

function isOptionalFlag(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

export { canPersist, defaultStorage };

export function readProgress(
  storage: Storage | null = defaultStorage(),
): WordJumpProgress {
  if (!storage) return emptyProgress();

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return emptyProgress();
  }
  if (!raw) return emptyProgress();

  try {
    const parsed: unknown = JSON.parse(raw);
    return isProgress(parsed) ? parsed : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

/** True when it was actually stored. False is a normal outcome, not an error. */
export function writeProgress(
  progress: WordJumpProgress,
  storage: Storage | null = defaultStorage(),
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

/** Adds one finished round of `language`. Returns a new object. */
export function recordLanguageRound(
  progress: WordJumpProgress,
  language: string,
  outcomes: RoundOutcome[],
  now: string,
): WordJumpProgress {
  return {
    ...progress,
    languages: {
      ...progress.languages,
      [language]: recordRound(
        progress.languages[language] ?? {},
        outcomes,
        now,
      ),
    },
  };
}
