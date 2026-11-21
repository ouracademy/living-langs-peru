import { describe, expect, it } from "vitest";

import {
  CLOUD_BOTTOM,
  CLOUD_WIDTH,
  VIEW_WIDTH,
  buildLayout,
  cameraX,
  cloudHit,
  passedDoor,
  standUnderX,
} from "@/lib/word-jump/platformer/level";
import {
  BODY_WIDTH,
  type Body,
  createBody,
} from "@/lib/word-jump/platformer/physics";

describe("buildLayout", () => {
  it("lays one challenge after another, each with its clouds and its door", () => {
    const layout = buildLayout([3, 4, 3]);

    expect(layout.challenges).toHaveLength(3);
    expect(layout.challenges.map((each) => each.clouds.length)).toEqual([
      3, 4, 3,
    ]);
    layout.challenges.forEach((challenge, index) => {
      const lastCloud = challenge.clouds[challenge.clouds.length - 1];
      expect(challenge.spawnX).toBeGreaterThan(challenge.start);
      expect(challenge.clouds[0].x).toBeGreaterThan(challenge.spawnX);
      expect(challenge.doorX).toBeGreaterThan(lastCloud.x + CLOUD_WIDTH);
      expect(challenge.end).toBeGreaterThan(challenge.doorX);
      if (index > 0) {
        expect(challenge.start).toBe(layout.challenges[index - 1].end);
      }
    });
    expect(layout.finishX).toBeGreaterThan(layout.challenges[2].end);
    expect(layout.width).toBeGreaterThan(layout.finishX);
  });

  it("keeps clouds apart so one jump touches only one", () => {
    const [challenge] = buildLayout([4]).challenges;
    for (let index = 1; index < challenge.clouds.length; index++) {
      const gap =
        challenge.clouds[index].x -
        (challenge.clouds[index - 1].x + CLOUD_WIDTH);
      expect(gap).toBeGreaterThan(BODY_WIDTH);
    }
  });
});

describe("cloudHit", () => {
  const [challenge] = buildLayout([3]).challenges;
  const under = (index: number): Body => ({
    ...createBody(standUnderX(challenge.clouds[index])),
    onGround: false,
  });

  // AC-SP4b-2
  it("is the cloud whose bottom the head crosses going up", () => {
    const before = { ...under(1), y: CLOUD_BOTTOM + 4, vy: -400 };
    const after = { ...before, y: CLOUD_BOTTOM - 4 };
    expect(cloudHit(before, after, challenge.clouds)).toBe(1);
  });

  it("is nothing when falling, or when beside every cloud", () => {
    const before = { ...under(1), y: CLOUD_BOTTOM - 4, vy: 300 };
    expect(
      cloudHit(before, { ...before, y: CLOUD_BOTTOM + 4 }, challenge.clouds),
    ).toBeNull();

    const between = {
      ...under(0),
      x: challenge.clouds[0].x + CLOUD_WIDTH + 2,
      y: CLOUD_BOTTOM + 4,
      vy: -400,
    };
    expect(
      cloudHit(between, { ...between, y: CLOUD_BOTTOM - 4 }, challenge.clouds),
    ).toBeNull();
  });

  it("stands the body centred under a cloud", () => {
    const cloud = challenge.clouds[2];
    const x = standUnderX(cloud);
    expect(x + BODY_WIDTH / 2).toBeCloseTo(cloud.x + CLOUD_WIDTH / 2);
  });
});

describe("passedDoor and cameraX", () => {
  const [challenge] = buildLayout([3]).challenges;

  // AC-SP4b-4
  it("counts the door as passed only once the body is through it", () => {
    expect(passedDoor(createBody(challenge.doorX - 50), challenge)).toBe(false);
    expect(passedDoor(createBody(challenge.end - 10), challenge)).toBe(true);
  });

  it("follows the player and stays inside the level", () => {
    expect(cameraX(10, VIEW_WIDTH, 5000)).toBe(0);
    expect(cameraX(2000, VIEW_WIDTH, 5000)).toBeGreaterThan(1500);
    expect(cameraX(4990, VIEW_WIDTH, 5000)).toBe(5000 - VIEW_WIDTH);
    expect(cameraX(300, VIEW_WIDTH, 400)).toBe(0);
  });
});
