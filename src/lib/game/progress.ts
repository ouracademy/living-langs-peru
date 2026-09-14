/**
 * Progress kept in the browser, and nowhere else.
 *
 * Two rules shape everything here. Anything read back is suspect — it can be
 * edited by hand, left by an older build, or truncated — so it is validated
 * and discarded rather than half-repaired. And the storage may simply refuse:
 * in a private window, reading or writing throws, so every path has an
 * explicit neutral answer and the game stays playable.
 *
 * Nothing stored identifies anybody. There is no account and nothing to send.
 */

/** Version in the key as well as in the value: a new schema writes elsewhere. */
export const STORAGE_KEY = "living-langs:word-game:v1";

const VERSION = 1;

export type LanguageProgress = {
  lessonsCompleted: number;
  /** Item ids answered correctly at least once. Feeds `buildLesson`. */
  masteredItemIds: string[];
  /** ISO timestamp, only to show when the last practice was. */
  lastPlayedAt: string;
};

export type Progress = {
  version: typeof VERSION;
  languages: Record<string, LanguageProgress>;
};

export function emptyProgress(): Progress {
  return { version: VERSION, languages: {} };
}

function isLanguageProgress(value: unknown): value is LanguageProgress {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.lessonsCompleted === "number" &&
    Number.isFinite(candidate.lessonsCompleted) &&
    candidate.lessonsCompleted >= 0 &&
    Array.isArray(candidate.masteredItemIds) &&
    candidate.masteredItemIds.every((id) => typeof id === "string") &&
    typeof candidate.lastPlayedAt === "string"
  );
}

function isProgress(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;

  if (candidate.version !== VERSION) return false;
  if (typeof candidate.languages !== "object" || candidate.languages === null) {
    return false;
  }

  return Object.values(candidate.languages).every(isLanguageProgress);
}

/**
 * The browser's store, or null when there isn't one.
 *
 * Reading the property itself throws when site data is blocked, so even the
 * lookup is guarded.
 */
export function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether the browser will actually keep what we write.
 *
 * A store can exist and still refuse every write — that is what blocked site
 * data looks like — so the only way to know is to try. One probe key, removed
 * straight away; the caller is expected to ask once and remember.
 */
export function canPersist(
  storage: Storage | null = defaultStorage(),
): boolean {
  if (!storage) return false;

  const probe = `${STORAGE_KEY}:probe`;

  try {
    storage.setItem(probe, "1");
    storage.removeItem(probe);

    return true;
  } catch {
    return false;
  }
}

export function readProgress(
  storage: Storage | null = defaultStorage(),
): Progress {
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
  progress: Progress,
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

export function forLanguage(
  progress: Progress,
  language: string,
): LanguageProgress {
  return (
    progress.languages[language] ?? {
      lessonsCompleted: 0,
      masteredItemIds: [],
      lastPlayedAt: "",
    }
  );
}

/** Pure: folds one finished lesson into the progress and returns a new one. */
export function recordLesson(
  progress: Progress,
  language: string,
  masteredItemIds: string[],
  now: Date,
): Progress {
  const current = forLanguage(progress, language);

  return {
    ...progress,
    languages: {
      ...progress.languages,
      [language]: {
        lessonsCompleted: current.lessonsCompleted + 1,
        masteredItemIds: [
          ...new Set([...current.masteredItemIds, ...masteredItemIds]),
        ],
        lastPlayedAt: now.toISOString(),
      },
    },
  };
}
