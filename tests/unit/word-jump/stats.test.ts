import { describe, expect, it } from "vitest";

import { recordRound } from "@/lib/word-jump/stats";

const NOW = "2026-11-18T10:00:00.000Z";

describe("recordRound", () => {
  it("counts a first sighting", () => {
    const progress = recordRound(
      {},
      [{ itemId: "a", misses: 0, correctFirstTry: true, revealed: false }],
      NOW,
    );

    expect(progress).toEqual({
      a: { seen: 1, correctFirstTry: 1, missed: 0, lastSeenAt: NOW },
    });
  });

  it("adds to what was there and leaves other items alone", () => {
    const before = {
      a: {
        seen: 2,
        correctFirstTry: 1,
        missed: 1,
        lastSeenAt: "2026-11-01T00:00:00Z",
      },
      b: {
        seen: 1,
        correctFirstTry: 1,
        missed: 0,
        lastSeenAt: "2026-11-01T00:00:00Z",
      },
    };

    const after = recordRound(
      before,
      [{ itemId: "a", misses: 2, correctFirstTry: false, revealed: true }],
      NOW,
    );

    expect(after.a).toEqual({
      seen: 3,
      correctFirstTry: 1,
      missed: 3,
      lastSeenAt: NOW,
    });
    expect(after.b).toBe(before.b);
  });

  it("does not change the progress it was given", () => {
    const before = {
      a: {
        seen: 1,
        correctFirstTry: 0,
        missed: 1,
        lastSeenAt: "2026-11-01T00:00:00Z",
      },
    };
    const copy = structuredClone(before);

    recordRound(
      before,
      [{ itemId: "a", misses: 0, correctFirstTry: true, revealed: false }],
      NOW,
    );

    expect(before).toEqual(copy);
  });
});
