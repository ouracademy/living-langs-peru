/**
 * Geometry of the jump drawn on the canvas. Pure, so the canvas component only
 * paints: jsdom cannot draw, and the rules belong in a tested place.
 * The canvas is decorative (decision #10); the real controls are the buttons.
 */

export type Point = { x: number; y: number };
export type JumpOutcome = "land" | "bounce";

export const JUMP_DURATION_MS = 600;

/** How high the arc goes above the higher end, in canvas units. */
const ARC_HEIGHT = 70;
/** How far below the platform a bounce ends. */
const BOUNCE_DROP = 60;

/** The platforms sit at 60% of the height, evenly spread across the width. */
export function platformCenters(
  width: number,
  height: number,
  count: number,
): Point[] {
  return Array.from({ length: count }, (_, index) => ({
    x: (width * (index + 1)) / (count + 1),
    y: height * 0.6,
  }));
}

/** Where the character waits: bottom centre. */
export function startPoint(width: number, height: number): Point {
  return { x: width / 2, y: height * 0.92 };
}

/** 0 → 1 over the jump, clamped. */
export function jumpProgress(elapsedMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / JUMP_DURATION_MS));
}

/**
 * Position at progress `t` (0..1): a parabola from `from` to `to`. A wrong
 * answer bounces: it reaches the platform at 80% of the jump and falls off.
 */
export function jumpPoint(
  from: Point,
  to: Point,
  t: number,
  outcome: JumpOutcome,
): Point {
  const progress = Math.min(1, Math.max(0, t));
  const reach = outcome === "land" ? 1 : 0.8;

  if (progress > reach) {
    const fall = (progress - reach) / (1 - reach);
    return { x: to.x, y: to.y + BOUNCE_DROP * fall * fall };
  }

  const along = progress / reach;
  const top = Math.min(from.y, to.y) - ARC_HEIGHT;
  // Quadratic Bézier through a control point above the middle.
  const control = { x: (from.x + to.x) / 2, y: 2 * top - (from.y + to.y) / 2 };
  const inverse = 1 - along;

  return {
    x:
      inverse * inverse * from.x +
      2 * inverse * along * control.x +
      along * along * to.x,
    y:
      inverse * inverse * from.y +
      2 * inverse * along * control.y +
      along * along * to.y,
  };
}
