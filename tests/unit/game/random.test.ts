import { describe, expect, it } from "vitest";

import { mulberry32, shuffle } from "@/lib/game/random";

describe("mulberry32", () => {
  it("returns numbers in [0, 1)", () => {
    const random = mulberry32(1);

    for (let draw = 0; draw < 200; draw++) {
      const value = random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("gives the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);

    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("gives a different sequence for a different seed", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("shuffle", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];

  it("keeps every element exactly once", () => {
    expect([...shuffle(items, mulberry32(3))].sort((a, b) => a - b)).toEqual(
      items,
    );
  });

  it("does not touch the array it was given", () => {
    const original = [...items];
    shuffle(items, mulberry32(3));

    expect(items).toEqual(original);
  });

  it("is deterministic for a given seed", () => {
    expect(shuffle(items, mulberry32(7))).toEqual(
      shuffle(items, mulberry32(7)),
    );
  });

  it("actually reorders", () => {
    const orders = new Set(
      [1, 2, 3, 4, 5].map((seed) => shuffle(items, mulberry32(seed)).join()),
    );

    expect(orders.size).toBeGreaterThan(1);
  });

  it("handles the empty array and a single element", () => {
    expect(shuffle([], mulberry32(1))).toEqual([]);
    expect(shuffle(["only"], mulberry32(1))).toEqual(["only"]);
  });
});
