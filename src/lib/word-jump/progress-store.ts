/**
 * `localStorage` as an external store for `useSyncExternalStore`, as in
 * `src/lib/game/progress-store.ts`: the server renders an empty progress and
 * the client its own, without an effect that sets state after mount.
 */
import type { RoundOutcome } from "./round.ts";
import {
  STORAGE_KEY,
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
  const updated = recordLanguageRound(
    readProgress(),
    language,
    outcomes,
    now.toISOString(),
  );

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
