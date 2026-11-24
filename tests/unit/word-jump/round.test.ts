import { describe, expect, it } from "vitest";

import type { PackItem } from "@/lib/language-packs/types";
import { ROUND_SIZE } from "@/lib/word-jump/constants";
import { buildRound } from "@/lib/word-jump/round";

import { testItem } from "../language-packs/fixtures";

const EMOJIS = [
  "🍎",
  "🐶",
  "🌳",
  "🐟",
  "🌙",
  "⭐",
  "🔥",
  "💧",
  "🌽",
  "🐦",
  "🪨",
  "🦋",
];

function manyItems(count: number): PackItem[] {
  return Array.from({ length: count }, (_, index) =>
    testItem({
      id: `item-${index}`,
      word: `PRUEBA ${index}`,
      translation: `prueba ${index}`,
      emoji: EMOJIS[index],
    }),
  );
}

describe("buildRound", () => {
  // AC-SP2-8
  it("puts the items never answered right first", () => {
    const items = manyItems(12);
    const stats = Object.fromEntries(
      items.slice(0, 9).map((item) => [
        item.id,
        {
          seen: 3,
          correctFirstTry: 2,
          missed: 0,
          lastSeenAt: "2026-11-01T00:00:00Z",
        },
      ]),
    );
    const neverRight = items.slice(9).map((item) => item.id);

    const round = buildRound(items, stats, 5);

    expect(
      round
        .slice(0, 3)
        .map((item) => item.id)
        .sort(),
    ).toEqual([...neverRight].sort());
  });

  it("puts the most missed before the rest", () => {
    const items = manyItems(4);
    const known = {
      seen: 2,
      correctFirstTry: 1,
      lastSeenAt: "2026-11-01T00:00:00Z",
    };
    const stats = {
      [items[0].id]: { ...known, missed: 0 },
      [items[1].id]: { ...known, missed: 1 },
      [items[2].id]: { ...known, missed: 4 },
      [items[3].id]: { ...known, missed: 0 },
    };

    const round = buildRound(items, stats, 5).map((item) => item.id);

    expect(round.slice(0, 2)).toEqual([items[2].id, items[1].id]);
  });

  it(`caps the round at ${ROUND_SIZE} and is shorter with fewer items`, () => {
    expect(buildRound(manyItems(12), {}, 1)).toHaveLength(ROUND_SIZE);
    expect(buildRound(manyItems(4), {}, 1)).toHaveLength(4);
  });

  it("is the same for the same seed", () => {
    const items = manyItems(12);
    expect(buildRound(items, {}, 9)).toEqual(buildRound(items, {}, 9));
  });
});
