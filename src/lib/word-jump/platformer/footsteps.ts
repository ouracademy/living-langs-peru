/**
 * The rhythm of Pip's steps (spec §7.7, AC-SP4c-7): a step every STEP_MS
 * while running on the ground, the first one as soon as running starts, and
 * none in the air or standing still. Pure.
 */
import type { Body } from "./physics.ts";

export const STEP_MS = 260;

/** Slower than this is standing, not running (world units per second). */
const RUNNING_SPEED = 40;

export function isRunning(body: Body): boolean {
  return body.onGround && Math.abs(body.vx) >= RUNNING_SPEED;
}

/**
 * `elapsed` is the time since the last step, or null when Pip was not
 * running. Returns the new value and whether a step sounds now.
 */
export function stepFootsteps(
  elapsed: number | null,
  dt: number,
  running: boolean,
): { elapsed: number | null; step: boolean } {
  if (!running) return { elapsed: null, step: false };
  if (elapsed === null) return { elapsed: 0, step: true };

  const next = elapsed + dt;
  if (next >= STEP_MS) return { elapsed: next - STEP_MS, step: true };
  return { elapsed: next, step: false };
}
