import { afterEach, describe, expect, it, vi } from "vitest";

import {
  STORAGE_KEY,
  emptyProgress,
  readProgress,
  recordLanguageRound,
  writeProgress,
} from "@/lib/word-jump/progress";
import {
  getServerSnapshot,
  getSnapshot,
  resetStore,
  saveRound,
} from "@/lib/word-jump/progress-store";

const outcome = (itemId: string, misses = 0) => ({
  itemId,
  misses,
  correctFirstTry: misses === 0,
  revealed: false,
});

/** A storage that refuses everything, as in a private window. */
function refusingStorage(): Storage {
  const fail = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  return {
    length: 0,
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

afterEach(() => {
  localStorage.clear();
  resetStore();
  vi.restoreAllMocks();
});

describe("word-jump progress", () => {
  it("uses its own versioned key", () => {
    expect(STORAGE_KEY).toBe("living-langs:word-jump:v1");
  });

  it("round-trips through the storage", () => {
    const progress = recordLanguageRound(
      emptyProgress(),
      "ashaninka",
      [outcome("item-uno"), outcome("item-dos", 1)],
      "2026-11-18T10:00:00.000Z",
    );

    expect(writeProgress(progress, localStorage)).toBe(true);
    expect(readProgress(localStorage)).toEqual(progress);
    expect(progress.languages.ashaninka["item-dos"]).toEqual({
      seen: 1,
      correctFirstTry: 0,
      missed: 1,
      lastSeenAt: "2026-11-18T10:00:00.000Z",
    });
  });

  it("keeps the languages apart", () => {
    const progress = recordLanguageRound(
      recordLanguageRound(emptyProgress(), "ashaninka", [outcome("a")], "t1"),
      "aimara",
      [outcome("b")],
      "t2",
    );

    expect(Object.keys(progress.languages)).toEqual(["ashaninka", "aimara"]);
  });

  it("throws away a stored value that is not valid, instead of repairing it", () => {
    for (const bad of [
      "{not json",
      JSON.stringify({ version: 2, languages: {}, settings: { sound: true } }),
      JSON.stringify({ version: 1, languages: {}, settings: {} }),
      JSON.stringify({
        version: 1,
        languages: { ashaninka: { x: { seen: -1 } } },
        settings: { sound: true },
      }),
      JSON.stringify({
        version: 1,
        languages: { ashaninka: [] },
        settings: { sound: true },
      }),
    ]) {
      localStorage.setItem(STORAGE_KEY, bad);
      expect(readProgress(localStorage)).toEqual(emptyProgress());
    }
  });

  // AC-SP4-7: with storage blocked, the game still works.
  it("answers neutrally when the storage refuses or is missing", () => {
    expect(readProgress(refusingStorage())).toEqual(emptyProgress());
    expect(writeProgress(emptyProgress(), refusingStorage())).toBe(false);
    expect(readProgress(null)).toEqual(emptyProgress());
    expect(writeProgress(emptyProgress(), null)).toBe(false);
  });
});

describe("word-jump progress store", () => {
  it("returns the same snapshot object while nothing changes", () => {
    expect(getSnapshot()).toBe(getSnapshot());
  });

  it("returns a new snapshot after a round is saved, and keeps it", () => {
    const before = getSnapshot();
    saveRound("ashaninka", [outcome("item-uno")]);

    const after = getSnapshot();
    expect(after).not.toBe(before);
    expect(after.progress.languages.ashaninka["item-uno"].seen).toBe(1);
    expect(getSnapshot()).toBe(after);
  });

  it("renders nothing saved on the server, with a stable identity", () => {
    const server = getServerSnapshot();

    expect(server.progress.languages).toEqual({});
    expect(server.storageAvailable).toBe(true);
    expect(getServerSnapshot()).toBe(server);
  });

  it("notifies subscribers when a round is saved", async () => {
    const { subscribe } = await import("@/lib/word-jump/progress-store");
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    saveRound("ashaninka", [outcome("item-uno")]);
    unsubscribe();
    saveRound("ashaninka", [outcome("item-uno")]);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("says when the browser will not keep anything", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(getSnapshot().storageAvailable).toBe(false);
    // Saving fails quietly: the game goes on.
    expect(() => saveRound("ashaninka", [outcome("item-uno")])).not.toThrow();
    expect(getSnapshot().storageAvailable).toBe(false);
  });
});
