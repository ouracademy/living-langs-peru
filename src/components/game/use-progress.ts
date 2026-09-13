"use client";

import { useCallback, useSyncExternalStore } from "react";

import { forLanguage } from "@/lib/game/progress";
import {
  getServerSnapshot,
  getSnapshot,
  saveLesson as save,
  subscribe,
} from "@/lib/game/progress-store";

/**
 * The saved progress for one language, read the way React wants an external
 * store read: no effect, no state set after mount, and no hydration mismatch,
 * because the server snapshot is what gets rendered into the HTML.
 */
export function useProgress(language: string) {
  const { progress, storageAvailable } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const saveLesson = useCallback(
    (masteredItemIds: string[]) => save(language, masteredItemIds),
    [language],
  );

  const languageProgress = forLanguage(progress, language);

  return {
    storageAvailable,
    lessonsCompleted: languageProgress.lessonsCompleted,
    masteredItemIds: languageProgress.masteredItemIds,
    saveLesson,
  };
}
