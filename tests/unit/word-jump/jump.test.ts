import { describe, expect, it } from "vitest";

import {
  JUMP_DURATION_MS,
  jumpPoint,
  jumpProgress,
  platformCenters,
  startPoint,
} from "@/lib/word-jump/jump";

const W = 600;
const H = 300;

describe("platformCenters", () => {
  it("spreads the platforms evenly across the width, at one height", () => {
    const centers = platformCenters(W, H, 3);

    expect(centers).toHaveLength(3);
    expect(centers[1].x - centers[0].x).toBeCloseTo(
      centers[2].x - centers[1].x,
    );
    expect(new Set(centers.map((center) => center.y)).size).toBe(1);
    expect(centers[0].x).toBeGreaterThan(0);
    expect(centers[2].x).toBeLessThan(W);
  });
});

describe("jumpPoint", () => {
  const from = startPoint(W, H);
  const to = platformCenters(W, H, 3)[2];

  it("starts where the character stands", () => {
    expect(jumpPoint(from, to, 0, "land")).toEqual(from);
  });

  it("lands on the platform when the answer is right", () => {
    const end = jumpPoint(from, to, 1, "land");

    expect(end.x).toBeCloseTo(to.x);
    expect(end.y).toBeCloseTo(to.y);
  });

  it("goes above both ends halfway", () => {
    const middle = jumpPoint(from, to, 0.5, "land");

    expect(middle.y).toBeLessThan(Math.min(from.y, to.y));
  });

  it("bounces back down when the answer is wrong", () => {
    const end = jumpPoint(from, to, 1, "bounce");

    expect(end.y).toBeGreaterThan(to.y);
  });

  it("clamps progress outside 0..1", () => {
    expect(jumpPoint(from, to, -1, "land")).toEqual(
      jumpPoint(from, to, 0, "land"),
    );
    expect(jumpPoint(from, to, 2, "land")).toEqual(
      jumpPoint(from, to, 1, "land"),
    );
  });
});

describe("jumpProgress", () => {
  it("goes from 0 to 1 over the jump duration", () => {
    expect(jumpProgress(0)).toBe(0);
    expect(jumpProgress(JUMP_DURATION_MS / 2)).toBeCloseTo(0.5);
    expect(jumpProgress(JUMP_DURATION_MS * 3)).toBe(1);
  });
});
