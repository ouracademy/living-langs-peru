/** What a finished round leaves behind for one item (spec §5.5). */
export type RoundOutcome = {
  itemId: string;
  misses: number;
  correctFirstTry: boolean;
  revealed: boolean;
};

/** What the browser remembers about one item (spec §5.5). Never leaves it. */
export type ItemStats = {
  seen: number;
  correctFirstTry: number;
  missed: number;
  /** ISO 8601. */
  lastSeenAt: string;
};

export type LanguageProgress = Record<string /* item id */, ItemStats>;

/** Adds one finished round to the progress. Returns a new object. */
export function recordRound(
  progress: LanguageProgress,
  outcomes: RoundOutcome[],
  now: string,
): LanguageProgress {
  const next: LanguageProgress = { ...progress };

  for (const outcome of outcomes) {
    const before = progress[outcome.itemId];
    next[outcome.itemId] = {
      seen: (before?.seen ?? 0) + 1,
      correctFirstTry:
        (before?.correctFirstTry ?? 0) + (outcome.correctFirstTry ? 1 : 0),
      missed: (before?.missed ?? 0) + outcome.misses,
      lastSeenAt: now,
    };
  }

  return next;
}
