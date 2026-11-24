/**
 * `localStorage` as an external store for `useSyncExternalStore`, as in
 * `src/lib/game/progress-store.ts`: the server renders an empty progress and
 * the client its own, without an effect that sets state after mount.
 */
import type { RoundOutcome } from "./stats.ts";
import {
  STORAGE_KEY,
  type ToggleSetting,
  type WordJumpProgress,
  canPersist,
  defaultStorage,
  emptyProgress,
  readProgress,
  recordLanguageRound,
  writeProgress,
} from "./progress.ts";

export type ProgressSnapshot = {
  progress: WordJumpProgress;
  /** False once we know the browser will not keep anything for us. */
  storageAvailable: boolean;
};

/** Frozen and reused: a fresh object every call would re-render forever. */
const SERVER_SNAPSHOT: ProgressSnapshot = Object.freeze({
  progress: emptyProgress(),
  storageAvailable: true,
});

const listeners = new Set<() => void>();

let snapshot: ProgressSnapshot | null = null;
let snapshotOf: string | null = null;
let writable = true;
let persists: boolean | null = null;

function rawValue(): string | null {
  const storage = defaultStorage();
  if (!storage) return null;

  try {
    return storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getServerSnapshot(): ProgressSnapshot {
  return SERVER_SNAPSHOT;
}

export function getSnapshot(): ProgressSnapshot {
  const raw = rawValue();
  // Probed once: a store can exist and still refuse every write.
  if (persists === null) persists = canPersist();
  const available = writable && persists;

  if (
    snapshot &&
    snapshotOf === raw &&
    snapshot.storageAvailable === available
  ) {
    return snapshot;
  }

  snapshotOf = raw;
  snapshot = { progress: readProgress(), storageAvailable: available };
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab of the same game writing progress is a real change.
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Folds one finished round in and persists it. Called once per round. */
export function saveRound(
  language: string,
  outcomes: RoundOutcome[],
  now: Date = new Date(),
): void {
  persist(
    recordLanguageRound(readProgress(), language, outcomes, now.toISOString()),
  );
}

/** The sound effects switch (spec §7.6, AC-SP4b-8), kept with the progress. */
export function saveSound(on: boolean): void {
  saveSetting("sound", on);
}

/** Any of the level's switches: sound, voice, saying the word on approach. */
export function saveSetting(key: ToggleSetting, on: boolean): void {
  const current = readProgress();
  persist({ ...current, settings: { ...current.settings, [key]: on } });
}

function persist(updated: WordJumpProgress): void {
  if (!writeProgress(updated)) {
    // Nothing was kept; the start screen says so and the game goes on.
    writable = false;
  }

  snapshot = null;
  snapshotOf = null;
  for (const listener of listeners) listener();
}

/** Test seam: forgets the cached snapshot and the failed-write flag. */
export function resetStore(): void {
  snapshot = null;
  snapshotOf = null;
  writable = true;
  persists = null;
}
