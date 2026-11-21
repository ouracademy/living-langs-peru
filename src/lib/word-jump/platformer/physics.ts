/**
 * The body of the player and how it moves (spec §7.6). Pure: time comes in as
 * an argument, so the rules are tested here and the canvas only paints.
 * World units: the level is 360 high; x grows to the right, y downwards.
 */

/** Top of the ground. */
export const GROUND_Y = 300;
export const BODY_WIDTH = 34;
export const BODY_HEIGHT = 40;

/** Units per second squared. */
export const GRAVITY = 2200;
/** Units per second. */
export const RUN_SPEED = 220;
/** Upward speed when a jump starts. */
export const JUMP_SPEED = 820;
/** Releasing the key caps the rise at this fraction: a tap is a hop. */
export const JUMP_CUT = 0.45;
export const MAX_FALL_SPEED = 900;
/** A jump still starts this long after leaving the ground. */
export const COYOTE_MS = 100;
/** Longer frames are cut: a slow device never tunnels through a door. */
export const MAX_STEP_MS = 32;
/** A tab coming back from the background does not replay seconds of play. */
export const MAX_FRAME_MS = 250;

export type Body = {
  /** Top-left corner. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** Time since it left the ground, for the jump margin. */
  airborneMs: number;
  /** The jump key as it was on the last step: a jump starts on a press. */
  jumpHeld: boolean;
  facing: 1 | -1;
};

export type Input = { left: boolean; right: boolean; jump: boolean };

/** Something that blocks from its left side at `x`, at any height. */
export type Wall = { x: number };

export type World = {
  groundY: number;
  minX: number;
  maxX: number;
  walls: Wall[];
};

export function createBody(x: number, groundY = GROUND_Y): Body {
  return {
    x,
    y: groundY - BODY_HEIGHT,
    vx: 0,
    vy: 0,
    onGround: true,
    airborneMs: 0,
    jumpHeld: false,
    facing: 1,
  };
}

/** Standing still on the ground: the animation loop may stop. */
export function isMoving(body: Body): boolean {
  return !body.onGround || body.vx !== 0 || body.vy !== 0;
}

/** Hitting a cloud from below: the head stops at its bottom edge. */
export function bonk(body: Body, ceiling: number): Body {
  return { ...body, y: ceiling, vy: 0 };
}

function blockedX(from: number, to: number, walls: Wall[]): number {
  let x = to;
  for (const wall of walls) {
    const stop = wall.x - BODY_WIDTH;
    // Only from the left: once past a wall (an open door) it no longer counts.
    if (from <= stop && x > stop) x = stop;
  }
  return x;
}

export function stepBody(
  body: Body,
  input: Input,
  dtMs: number,
  world: World,
): Body {
  let current = body;
  // A frame longer than one step is several steps, never one big jump in x.
  for (let left = Math.min(dtMs, MAX_FRAME_MS); left > 0; left -= MAX_STEP_MS) {
    current = step(current, input, Math.min(left, MAX_STEP_MS), world);
  }
  return current;
}

function step(body: Body, input: Input, ms: number, world: World): Body {
  const dt = ms / 1000;
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const vx = direction * RUN_SPEED;
  const facing: 1 | -1 = direction === 0 ? body.facing : direction > 0 ? 1 : -1;

  let vy = body.vy;
  let onGround = body.onGround;
  let airborneMs = body.airborneMs;

  const pressed = input.jump && !body.jumpHeld;
  if (pressed && (onGround || airborneMs <= COYOTE_MS)) {
    vy = -JUMP_SPEED;
    onGround = false;
    // Spent: the margin does not give a second jump in the air.
    airborneMs = COYOTE_MS + 1;
  }
  if (!input.jump && vy < -JUMP_SPEED * JUMP_CUT) {
    vy = -JUMP_SPEED * JUMP_CUT;
  }

  vy = Math.min(vy + GRAVITY * dt, MAX_FALL_SPEED);

  const maxX = world.maxX - BODY_WIDTH;
  const x = Math.min(
    Math.max(blockedX(body.x, body.x + vx * dt, world.walls), world.minX),
    maxX,
  );
  let y = body.y + vy * dt;

  if (y + BODY_HEIGHT >= world.groundY) {
    y = world.groundY - BODY_HEIGHT;
    vy = 0;
    onGround = true;
    airborneMs = 0;
  } else {
    if (onGround) airborneMs = 0;
    onGround = false;
    airborneMs += ms;
  }

  return { x, y, vx, vy, onGround, airborneMs, jumpHeld: input.jump, facing };
}
