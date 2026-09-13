import {
  type Progress,
  STORAGE_KEY,
  defaultStorage,
  emptyProgress,
  readProgress,
  recordLesson,
  writeProgress,
} from "./progress.ts";

/**
 * `localStorage` as an external store, so React can read it with
 * `useSyncExternalStore` instead of an effect that sets state after mount.
 *
 * That is not a style preference. The server has no storage, so the value
 * differs between the server render and the client; `useSyncExternalStore` is
 * the API that handles exactly that split, with `getServerSnapshot` used
 * during hydration and the real one after. Reading storage in a `useState`
 * initialiser would render different HTML than the server sent.
 */

export type ProgressSnapshot = {
  progress: Progress;
  /** False once we know the browser will not keep anything for us. */
  storageAvailable: boolean;
};

/**
 * What the server renders: no progress, and no warning. Frozen and reused, so
 * its identity is stable — `useSyncExternalStore` re-renders forever if a
 * snapshot getter keeps returning fresh objects.
 */
const SERVER_SNAPSHOT: ProgressSnapshot = Object.freeze({
  progress: emptyProgress(),
  storageAvailable: true,
});

const listeners = new Set<() => void>();

let snapshot: ProgressSnapshot | null = null;
let snapshotOf: string | null = null;
let writable = true;

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
  const available = writable && defaultStorage() !== null;

  // Same stored text and same availability means the same snapshot object.
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

/** Folds one finished lesson in and persists it. Called once per lesson. */
export function saveLesson(
  language: string,
  masteredItemIds: string[],
  now: Date = new Date(),
): void {
  const updated = recordLesson(readProgress(), language, masteredItemIds, now);

  if (!writeProgress(updated)) {
    // Nothing was kept, and saying so is the honest thing: the notice on the
    // start screen tells the player their progress will not be remembered.
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
}
