/**
 * Where everything sits in a level (spec §7.6): one challenge per question,
 * each with its answer clouds and its wooden door, and the finish at the end.
 * Pure, in world units (see physics.ts).
 */
import { BODY_WIDTH, type Body } from "./physics.ts";

/** What the camera shows at once; the canvas scales it to its width. */
export const VIEW_WIDTH = 640;

export const CLOUD_WIDTH = 120;
export const CLOUD_HEIGHT = 56;
/** Bottom edge of every cloud: a held jump reaches it, a hop does not. */
export const CLOUD_BOTTOM = 178;
export const DOOR_WIDTH = 28;
/** The door is taller than any jump: it blocks at any height (physics.ts). */
export const DOOR_HEIGHT = 170;

const LEAD_IN = 200;
const CLOUD_STEP = 170;
const DOOR_GAP = 90;
const AFTER_DOOR = 140;
const SPAWN_OFFSET = 60;
const FINISH_GAP = 80;
const FINISH_RUN = 220;
/** A head brushing a cloud's corner does not count. */
const MIN_OVERLAP = 8;

export type Rect = { x: number; y: number; width: number; height: number };

export type ChallengeLayout = {
  start: number;
  /** Where the body appears for this challenge. */
  spawnX: number;
  clouds: Rect[];
  doorX: number;
  end: number;
};

export type LevelLayout = {
  challenges: ChallengeLayout[];
  finishX: number;
  width: number;
};

/** `optionCounts[i]`: how many clouds challenge i has (3, or 4 for vowels). */
export function buildLayout(optionCounts: number[]): LevelLayout {
  const challenges: ChallengeLayout[] = [];
  let start = 0;

  for (const count of optionCounts) {
    const clouds = Array.from({ length: count }, (_, index) => ({
      x: start + LEAD_IN + index * CLOUD_STEP,
      y: CLOUD_BOTTOM - CLOUD_HEIGHT,
      width: CLOUD_WIDTH,
      height: CLOUD_HEIGHT,
    }));
    const lastCloud = clouds[clouds.length - 1];
    const doorX = (lastCloud?.x ?? start + LEAD_IN) + CLOUD_WIDTH + DOOR_GAP;
    const end = doorX + DOOR_WIDTH + AFTER_DOOR;

    challenges.push({
      start,
      spawnX: start + SPAWN_OFFSET,
      clouds,
      doorX,
      end,
    });
    start = end;
  }

  const finishX = start + FINISH_GAP;
  return { challenges, finishX, width: finishX + FINISH_RUN };
}

function overlap(fromA: number, toA: number, fromB: number, toB: number) {
  return Math.min(toA, toB) - Math.max(fromA, fromB);
}

/**
 * The cloud whose bottom edge the head crossed between `before` and `after`
 * while going up, or null.
 */
export function cloudHit(
  before: Body,
  after: Body,
  clouds: Rect[],
): number | null {
  if (after.y >= before.y) return null;

  for (const [index, cloud] of clouds.entries()) {
    const bottom = cloud.y + cloud.height;
    const crossed = before.y >= bottom && after.y < bottom;
    const across = overlap(
      after.x,
      after.x + BODY_WIDTH,
      cloud.x,
      cloud.x + cloud.width,
    );
    if (crossed && across >= MIN_OVERLAP) return index;
  }
  return null;
}

/** The body's x when it stands centred under `cloud`. */
export function standUnderX(cloud: Rect): number {
  return cloud.x + cloud.width / 2 - BODY_WIDTH / 2;
}

export function passedDoor(body: Body, challenge: ChallengeLayout): boolean {
  return body.x > challenge.doorX + DOOR_WIDTH;
}

/** How far before the first cloud Pip «reaches» a challenge (spec §7.7). */
export const APPROACH_DISTANCE = 100;

/**
 * Where the word of a challenge is said: some way before its first cloud,
 * past where Pip appears, so walking in always crosses it.
 */
export function approachX(challenge: ChallengeLayout): number {
  const firstCloud = challenge.clouds[0]?.x ?? challenge.doorX;
  return Math.max(
    challenge.spawnX + 1,
    firstCloud - APPROACH_DISTANCE - BODY_WIDTH,
  );
}

/** Whether `body` has reached the clouds of `challenge`. */
export function reachedClouds(body: Body, challenge: ChallengeLayout): boolean {
  return body.x >= approachX(challenge);
}

/** Left edge of the view: the player a third in, never past the level. */
export function cameraX(
  playerX: number,
  viewWidth: number,
  levelWidth: number,
): number {
  const wanted = playerX - viewWidth / 3;
  return Math.max(0, Math.min(wanted, levelWidth - viewWidth));
}
