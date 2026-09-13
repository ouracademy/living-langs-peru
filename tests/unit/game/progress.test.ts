import { describe, expect, it } from "vitest";

import {
  STORAGE_KEY,
  emptyProgress,
  forLanguage,
  readProgress,
  recordLesson,
  writeProgress,
} from "@/lib/game/progress";

/** A stand-in for localStorage, so no test depends on the real one. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));

  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

/** The private-window case: touching it at all throws. */
function hostileStorage(): Storage {
  const boom = () => {
    throw new DOMException("denied", "SecurityError");
  };

  return {
    length: 0,
    clear: boom,
    getItem: boom,
    key: boom,
    removeItem: boom,
    setItem: boom,
  } as unknown as Storage;
}

const stored = (value: unknown) => ({ [STORAGE_KEY]: JSON.stringify(value) });

describe("readProgress", () => {
  // AC-G3-1
  it("returns empty progress when nothing is stored", () => {
    expect(readProgress(fakeStorage())).toEqual(emptyProgress());
  });

  it("returns empty progress when there is no storage at all", () => {
    expect(readProgress(null)).toEqual(emptyProgress());
  });

  // AC-G3-3
  it("discards a corrupt value instead of throwing", () => {
    expect(readProgress(fakeStorage({ [STORAGE_KEY]: "{not json" }))).toEqual(
      emptyProgress(),
    );
  });

  // AC-G3-4
  it("discards a value written by another schema version", () => {
    const other = stored({ version: 2, languages: {} });

    expect(readProgress(fakeStorage(other))).toEqual(emptyProgress());
  });

  // AC-G3-5
  it("discards a value whose shape is right but whose types are not", () => {
    const wrong = stored({
      version: 1,
      languages: {
        ashaninka: {
          lessonsCompleted: "many",
          masteredItemIds: [],
          lastPlayedAt: "2026-09-12",
        },
      },
    });

    expect(readProgress(fakeStorage(wrong))).toEqual(emptyProgress());
  });

  it("discards a mastered list that is not a list of strings", () => {
    const wrong = stored({
      version: 1,
      languages: {
        ashaninka: {
          lessonsCompleted: 1,
          masteredItemIds: [1, 2],
          lastPlayedAt: "2026-09-12",
        },
      },
    });

    expect(readProgress(fakeStorage(wrong))).toEqual(emptyProgress());
  });

  it("discards a negative lesson count", () => {
    const wrong = stored({
      version: 1,
      languages: {
        ashaninka: {
          lessonsCompleted: -3,
          masteredItemIds: [],
          lastPlayedAt: "2026-09-12",
        },
      },
    });

    expect(readProgress(fakeStorage(wrong))).toEqual(emptyProgress());
  });

  // AC-G3-6
  it("returns empty progress when reading throws", () => {
    expect(readProgress(hostileStorage())).toEqual(emptyProgress());
  });
});

describe("writeProgress", () => {
  // AC-G3-2
  it("round-trips", () => {
    const storage = fakeStorage();
    const progress = recordLesson(
      emptyProgress(),
      "ashaninka",
      ["a:0"],
      new Date("2026-09-12T10:00:00Z"),
    );

    expect(writeProgress(progress, storage)).toBe(true);
    expect(readProgress(storage)).toEqual(progress);
  });

  // AC-G3-6
  it("reports failure instead of throwing when writing is blocked", () => {
    expect(writeProgress(emptyProgress(), hostileStorage())).toBe(false);
    expect(writeProgress(emptyProgress(), null)).toBe(false);
  });
});

describe("recordLesson", () => {
  const at = new Date("2026-09-12T10:00:00Z");

  // AC-G3-7
  it("counts the lesson and remembers what was answered right", () => {
    const progress = recordLesson(emptyProgress(), "ashaninka", ["a:0"], at);
    const language = forLanguage(progress, "ashaninka");

    expect(language.lessonsCompleted).toBe(1);
    expect(language.masteredItemIds).toEqual(["a:0"]);
    expect(language.lastPlayedAt).toBe(at.toISOString());
  });

  it("adds to what was already mastered, without duplicating", () => {
    let progress = recordLesson(emptyProgress(), "ashaninka", ["a:0"], at);
    progress = recordLesson(progress, "ashaninka", ["a:0", "b:0"], at);
    const language = forLanguage(progress, "ashaninka");

    expect(language.lessonsCompleted).toBe(2);
    expect([...language.masteredItemIds].sort()).toEqual(["a:0", "b:0"]);
  });

  // AC-G3-8
  it("keeps languages apart", () => {
    let progress = recordLesson(emptyProgress(), "ashaninka", ["a:0"], at);
    progress = recordLesson(progress, "otra", ["z:0"], at);

    expect(forLanguage(progress, "ashaninka").masteredItemIds).toEqual(["a:0"]);
    expect(forLanguage(progress, "otra").masteredItemIds).toEqual(["z:0"]);
  });

  it("does not mutate the progress it was given", () => {
    const before = emptyProgress();
    recordLesson(before, "ashaninka", ["a:0"], at);

    expect(before).toEqual(emptyProgress());
  });

  it("stores nothing that identifies anybody", () => {
    const progress = recordLesson(emptyProgress(), "ashaninka", ["a:0"], at);

    expect(Object.keys(forLanguage(progress, "ashaninka")).sort()).toEqual([
      "lastPlayedAt",
      "lessonsCompleted",
      "masteredItemIds",
    ]);
  });
});

describe("forLanguage", () => {
  it("reads as empty for a language never played", () => {
    expect(forLanguage(emptyProgress(), "ashaninka")).toEqual({
      lessonsCompleted: 0,
      masteredItemIds: [],
      lastPlayedAt: "",
    });
  });
});
