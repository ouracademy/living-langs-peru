import { describe, expect, it } from "vitest";

import {
  STEP_MS,
  isRunning,
  stepFootsteps,
} from "@/lib/word-jump/platformer/footsteps";
import {
  buildLayout,
  approachX,
  reachedClouds,
} from "@/lib/word-jump/platformer/level";
import { RUN_SPEED, createBody } from "@/lib/word-jump/platformer/physics";

describe("stepFootsteps (AC-SP4c-7)", () => {
  it("steps as soon as running starts, then every STEP_MS", () => {
    let state = stepFootsteps(null, 16, true);
    expect(state.step).toBe(true);

    let steps = 0;
    for (let t = 0; t < STEP_MS * 3; t += 10) {
      state = stepFootsteps(state.elapsed, 10, true);
      if (state.step) steps += 1;
    }
    expect(steps).toBe(3);
  });

  it("is silent and resets when not running", () => {
    expect(stepFootsteps(120, 16, false)).toEqual({
      elapsed: null,
      step: false,
    });
  });
});

describe("isRunning", () => {
  it("is running only on the ground and moving", () => {
    const standing = createBody(0);
    expect(isRunning(standing)).toBe(false);
    expect(isRunning({ ...standing, vx: RUN_SPEED })).toBe(true);
    expect(isRunning({ ...standing, vx: -RUN_SPEED })).toBe(true);
    expect(isRunning({ ...standing, vx: RUN_SPEED, onGround: false })).toBe(
      false,
    );
  });
});

describe("approachX (AC-SP4c-3)", () => {
  const layout = buildLayout([3, 3]);

  it("lies between where Pip appears and the first cloud of each challenge", () => {
    for (const challenge of layout.challenges) {
      const x = approachX(challenge);
      expect(x).toBeGreaterThan(challenge.spawnX);
      expect(x).toBeLessThan(challenge.clouds[0].x);
    }
  });

  it("is reached by walking in, not where Pip appears", () => {
    const [challenge] = layout.challenges;
    expect(reachedClouds(createBody(challenge.spawnX), challenge)).toBe(false);
    expect(reachedClouds(createBody(approachX(challenge)), challenge)).toBe(
      true,
    );
  });
});
