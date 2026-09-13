import { afterEach, describe, expect, it } from "vitest";

import { forLanguage } from "@/lib/game/progress";
import {
  getServerSnapshot,
  getSnapshot,
  resetStore,
  saveLesson,
} from "@/lib/game/progress-store";

afterEach(() => {
  localStorage.clear();
  resetStore();
});

describe("the progress store", () => {
  // If a snapshot getter keeps returning fresh objects, useSyncExternalStore
  // re-renders forever. This is the test that catches that.
  it("returns the same snapshot object while nothing changes", () => {
    expect(getSnapshot()).toBe(getSnapshot());
  });

  it("returns a new snapshot after a lesson is saved", () => {
    const before = getSnapshot();
    saveLesson("ashaninka", ["a:0"]);

    expect(getSnapshot()).not.toBe(before);
    expect(
      forLanguage(getSnapshot().progress, "ashaninka").lessonsCompleted,
    ).toBe(1);
  });

  it("settles again after the change", () => {
    saveLesson("ashaninka", ["a:0"]);

    expect(getSnapshot()).toBe(getSnapshot());
  });

  it("renders nothing saved on the server, and never the warning", () => {
    const server = getServerSnapshot();

    expect(server.progress.languages).toEqual({});
    expect(server.storageAvailable).toBe(true);
    // Stable identity, or hydration would loop.
    expect(getServerSnapshot()).toBe(server);
  });

  it("accumulates across lessons", () => {
    saveLesson("ashaninka", ["a:0"]);
    saveLesson("ashaninka", ["b:0"]);

    const language = forLanguage(getSnapshot().progress, "ashaninka");

    expect(language.lessonsCompleted).toBe(2);
    expect([...language.masteredItemIds].sort()).toEqual(["a:0", "b:0"]);
  });

  it("recovers from a corrupt stored value without throwing", () => {
    localStorage.setItem("living-langs:word-game:v1", "{not json");
    resetStore();

    expect(getSnapshot().progress.languages).toEqual({});
  });
});
