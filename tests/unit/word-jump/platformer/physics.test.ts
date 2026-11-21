import { describe, expect, it } from "vitest";

import {
  BODY_HEIGHT,
  BODY_WIDTH,
  COYOTE_MS,
  GROUND_Y,
  type Body,
  type Input,
  type World,
  bonk,
  createBody,
  isMoving,
  stepBody,
} from "@/lib/word-jump/platformer/physics";

const world: World = { groundY: GROUND_Y, minX: 0, maxX: 2000, walls: [] };
const idle: Input = { left: false, right: false, jump: false };
const STEP = 16;

/** Runs `frames` steps with the same input. */
function run(body: Body, input: Input, frames: number, on = world): Body {
  let current = body;
  for (let frame = 0; frame < frames; frame++) {
    current = stepBody(current, input, STEP, on);
  }
  return current;
}

/** The highest point (smallest y) reached while `held(frame)` says jump. */
function apex(held: (frame: number) => boolean): number {
  let body = createBody(100);
  let top = body.y;
  for (let frame = 0; frame < 90; frame++) {
    body = stepBody(body, { ...idle, jump: held(frame) }, STEP, world);
    top = Math.min(top, body.y);
  }
  return top;
}

describe("stepBody", () => {
  it("starts standing on the ground", () => {
    const body = createBody(100);
    expect(body.y).toBe(GROUND_Y - BODY_HEIGHT);
    expect(body.onGround).toBe(true);
    expect(isMoving(body)).toBe(false);
  });

  it("runs right and left and stays on the ground", () => {
    const right = run(createBody(100), { ...idle, right: true }, 30);
    expect(right.x).toBeGreaterThan(100);
    expect(right.onGround).toBe(true);
    expect(right.facing).toBe(1);

    const left = run(createBody(100), { ...idle, left: true }, 10);
    expect(left.x).toBeLessThan(100);
    expect(left.facing).toBe(-1);
  });

  it("stops at the edges of the level", () => {
    expect(run(createBody(5), { ...idle, left: true }, 30).x).toBe(0);
    const end = run(createBody(1990), { ...idle, right: true }, 30);
    expect(end.x).toBe(world.maxX - BODY_WIDTH);
  });

  it("jumps once per press and lands back on the ground", () => {
    const up = stepBody(createBody(100), { ...idle, jump: true }, STEP, world);
    expect(up.vy).toBeLessThan(0);
    expect(up.onGround).toBe(false);

    // Holding the key does not jump again on landing.
    const landed = run(up, { ...idle, jump: true }, 120);
    expect(landed.onGround).toBe(true);
    expect(landed.y).toBe(GROUND_Y - BODY_HEIGHT);
    expect(landed.vy).toBe(0);
    expect(stepBody(landed, { ...idle, jump: true }, STEP, world).vy).toBe(0);
  });

  // AC-SP4b-6
  it("jumps higher while the key is held", () => {
    const tap = apex((frame) => frame < 2);
    const hold = apex(() => true);
    expect(hold).toBeLessThan(tap - 40);
  });

  // AC-SP4b-6
  it("still jumps an instant after leaving the ground, not later", () => {
    const airborne: Body = {
      ...createBody(100),
      y: GROUND_Y - BODY_HEIGHT - 1,
      onGround: false,
      airborneMs: COYOTE_MS - 20,
    };
    expect(
      stepBody(airborne, { ...idle, jump: true }, STEP, world).vy,
    ).toBeLessThan(-100);

    const tooLate = { ...airborne, airborneMs: COYOTE_MS + 20 };
    expect(
      stepBody(tooLate, { ...idle, jump: true }, STEP, world).vy,
    ).toBeGreaterThan(0);
  });

  // AC-SP4b-4
  it("does not walk through a wall, even jumping", () => {
    const walled: World = { ...world, walls: [{ x: 300 }] };
    const blocked = run(createBody(200), { ...idle, right: true }, 60, walled);
    expect(blocked.x).toBe(300 - BODY_WIDTH);

    const jumping = run(
      createBody(200),
      { left: false, right: true, jump: true },
      60,
      walled,
    );
    expect(jumping.x).toBeLessThanOrEqual(300 - BODY_WIDTH);
  });

  it("clamps long frames so a slow device does not tunnel", () => {
    const body = stepBody(createBody(100), { ...idle, right: true }, 5000, {
      ...world,
      walls: [{ x: 160 }],
    });
    expect(body.x).toBeLessThanOrEqual(160 - BODY_WIDTH);
  });

  it("bonks: stops rising under a cloud", () => {
    const rising = { ...createBody(100), y: 150, vy: -500, onGround: false };
    const after = bonk(rising, 178);
    expect(after.y).toBe(178);
    expect(after.vy).toBe(0);
  });
});
