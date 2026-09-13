import { describe, expect, it } from "vitest";

import { LESSON_SIZE } from "@/lib/game/constants";
import { buildLesson } from "@/lib/game/lesson";
import type { Item } from "@/lib/game/types";

function pool(size: number): Item[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `e${index}:0`,
    tokens: ["Nokoi", null, "kipatsiki"],
    answer: `word-${index}`,
    distractors: ["shima", "inchato"] as [string, string],
    prompt: `prompt ${index}`,
    answerTranslation: "yuca",
    sourceId: "test-source",
  }));
}

const ids = (items: Item[]) => items.map((item) => item.id);

describe("buildLesson", () => {
  it("asks for a lesson's worth of items", () => {
    expect(buildLesson(pool(40), [], 1)).toHaveLength(LESSON_SIZE);
  });

  it("never repeats an item within a lesson", () => {
    const lesson = buildLesson(pool(40), [], 1);

    expect(new Set(ids(lesson)).size).toBe(lesson.length);
  });

  // AC-G2-8
  it("uses the whole pool when it is smaller than a lesson", () => {
    expect(buildLesson(pool(4), [], 1)).toHaveLength(4);
  });

  it("returns nothing for an empty pool", () => {
    expect(buildLesson([], [], 1)).toEqual([]);
  });

  // AC-G2-7 — practising what you already know is the wrong use of ten items.
  it("puts items you have never got right before the rest", () => {
    const items = pool(12);
    const mastered = ids(items).slice(0, 10);
    const lesson = buildLesson(items, mastered, 1);
    const fresh = ids(items).slice(10);

    for (const id of fresh) {
      expect(ids(lesson)).toContain(id);
    }
  });

  it("falls back to mastered items when there are not enough fresh ones", () => {
    const items = pool(12);
    const lesson = buildLesson(items, ids(items).slice(0, 11), 1);

    expect(lesson).toHaveLength(LESSON_SIZE);
  });

  it("repeats mastered items once everything is mastered", () => {
    const items = pool(12);
    const lesson = buildLesson(items, ids(items), 1);

    expect(lesson).toHaveLength(LESSON_SIZE);
  });

  // AC-G2-9
  it("is the same lesson for the same seed, and a different one otherwise", () => {
    const items = pool(40);

    expect(ids(buildLesson(items, [], 5))).toEqual(
      ids(buildLesson(items, [], 5)),
    );

    const orders = new Set(
      [1, 2, 3, 4, 5].map((seed) => ids(buildLesson(items, [], seed)).join()),
    );

    expect(orders.size).toBeGreaterThan(1);
  });

  // AC-G3-9 — saved progress outlives the pool it was saved against.
  it("ignores mastered ids that are no longer in the pool", () => {
    const lesson = buildLesson(pool(12), ["gone:0", "also-gone:3"], 1);

    expect(lesson).toHaveLength(LESSON_SIZE);
  });
});
