/**
 * The mutable part of the level: Pip's body, the keys held, the jump to a
 * cloud started by a button, the effects and the animation loop. It lives
 * outside React state so a frame never re-renders the page; React only hears
 * about answers and doors (spec §7.6, plan §3.11).
 *
 * The loop runs only while something moves (AC-SP4-6): standing still with no
 * key held, it stops asking for frames.
 */
import { jumpPoint, type Point } from "@/lib/word-jump/jump";
import type { LevelState } from "@/lib/word-jump/platformer/game";
import { isRunning, stepFootsteps } from "@/lib/word-jump/platformer/footsteps";
import {
  type LevelLayout,
  VIEW_WIDTH,
  cameraX,
  cloudHit,
  passedDoor,
  reachedClouds,
  standUnderX,
} from "@/lib/word-jump/platformer/level";
import {
  type Body,
  COYOTE_MS,
  GROUND_Y,
  type Input,
  JUMP_SPEED,
  bonk,
  createBody,
  isMoving,
  stepBody,
} from "@/lib/word-jump/platformer/physics";

import {
  BURST_MS,
  type Burst,
  DOOR_MS,
  type DoorOpening,
  VIEW_HEIGHT,
  drawScene,
} from "./draw-platformer";

/** How long the jump to a cloud lasts when an answer button is used. */
const BUTTON_JUMP_MS = 600;

export type ControllerOptions = {
  layout: LevelLayout;
  level: LevelState;
  paused: boolean;
  onHit: (option: number) => void;
  onPassDoor: () => void;
  onJump: () => void;
  /** Pip reached the clouds of an open challenge: say its word (§7.7). */
  onApproach?: (challenge: number) => void;
  /** A footstep, at a fixed rhythm while running on the ground (§7.7). */
  onStep?: () => void;
};

export type Key = keyof Input;

type ButtonJump = { from: Point; to: Point; start: number };

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function canAnimate(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.requestAnimationFrame === "function" &&
    !prefersReducedMotion()
  );
}

function now(): number {
  return typeof performance === "undefined" ? 0 : performance.now();
}

export function createController(
  getOptions: () => ControllerOptions,
  getCanvas: () => HTMLCanvasElement | null,
) {
  const first = getOptions();
  let body: Body = createBody(
    first.layout.challenges[first.level.index]?.spawnX ?? 0,
  );
  const input: Input = { left: false, right: false, jump: false };
  let buttonJump: ButtonJump | null = null;
  let burst: Burst | null = null;
  let door: DoorOpening | null = null;
  let frame: number | null = null;
  let lastTime = 0;
  /** The challenge whose door was already reported as passed. */
  let passedFor = -1;
  /** The challenge whose clouds were already reported as reached. */
  let approachedFor = -1;
  /** Time since the last footstep; null while not running. */
  let stepElapsed: number | null = null;

  function draw(time = now()) {
    const canvas = getCanvas();
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const { layout, level } = getOptions();
    const ratio = canvas.width / VIEW_WIDTH;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawScene(context, {
      cameraX: cameraX(body.x, VIEW_WIDTH, layout.width),
      body,
      layout,
      level,
      time,
      burst,
      door,
      reducedMotion: prefersReducedMotion(),
    });
  }

  function busy(time: number): boolean {
    return (
      input.left ||
      input.right ||
      input.jump ||
      isMoving(body) ||
      buttonJump !== null ||
      (burst !== null && time - burst.start < BURST_MS) ||
      (door !== null && time - door.start < DOOR_MS)
    );
  }

  function tick(dt: number, time: number) {
    const {
      layout,
      level,
      paused,
      onHit,
      onPassDoor,
      onJump,
      onApproach,
      onStep,
    } = getOptions();
    if (paused || level.status !== "playing") return;
    const challenge = layout.challenges[level.index];
    if (!challenge) return;

    if (buttonJump) {
      stepElapsed = null;
      const t = (time - buttonJump.start) / BUTTON_JUMP_MS;
      if (t < 1) {
        const point = jumpPoint(buttonJump.from, buttonJump.to, t, "land");
        body = { ...body, x: point.x, y: point.y, onGround: false };
        return;
      }
      body = {
        ...createBody(buttonJump.to.x),
        y: buttonJump.to.y,
        onGround: false,
        airborneMs: COYOTE_MS + 1,
        jumpHeld: input.jump,
      };
      buttonJump = null;
      return;
    }

    const solved = level.challenges[level.index]?.solved ?? false;
    const before = body;
    let after = stepBody(before, input, dt, {
      groundY: GROUND_Y,
      minX: challenge.start,
      maxX: layout.width,
      walls: solved ? [] : [{ x: challenge.doorX }],
    });

    if (before.vy >= 0 && after.vy < -JUMP_SPEED / 2) onJump();

    const hit = cloudHit(before, after, challenge.clouds);
    if (hit !== null) {
      const cloud = challenge.clouds[hit];
      after = bonk(after, cloud.y + cloud.height);
      onHit(hit);
    }
    body = after;

    const steps = stepFootsteps(stepElapsed, dt, isRunning(body));
    stepElapsed = steps.elapsed;
    if (steps.step) onStep?.();

    // Once per challenge, and only while it is still open: an answer jump
    // that lands past this point must not repeat the word after «¡Correcto!».
    if (
      !solved &&
      approachedFor !== level.index &&
      reachedClouds(body, challenge)
    ) {
      approachedFor = level.index;
      onApproach?.(level.index);
    }

    if (solved && passedFor !== level.index && passedDoor(body, challenge)) {
      passedFor = level.index;
      onPassDoor();
    }
  }

  function loop(time: number) {
    const dt = lastTime === 0 ? 16 : time - lastTime;
    lastTime = time;
    tick(dt, time);
    draw(time);
    if (busy(time)) {
      frame = window.requestAnimationFrame(loop);
    } else {
      frame = null;
      lastTime = 0;
    }
  }

  /** Starts the loop if it is not running; without animation, one frame. */
  function kick() {
    if (!canAnimate()) {
      draw();
      return;
    }
    if (frame === null) frame = window.requestAnimationFrame(loop);
  }

  return {
    draw,

    /** A key or a touch control. Movement needs the loop. */
    setKey(key: Key, down: boolean) {
      if (input[key] === down) return;
      input[key] = down;
      if (down) kick();
    },

    releaseAll() {
      input.left = false;
      input.right = false;
      input.jump = false;
    },

    /**
     * An answer button: Pip jumps to that cloud. With reduced motion (or no
     * animation at all) Pip just stands under it, and no frame is asked for.
     */
    jumpTo(option: number) {
      const { layout, level } = getOptions();
      const cloud = layout.challenges[level.index]?.clouds[option];
      if (!cloud) return;
      const x = standUnderX(cloud);
      if (!canAnimate()) {
        body = createBody(x);
        draw();
        return;
      }
      buttonJump = {
        from: { x: body.x, y: body.y },
        to: { x, y: cloud.y + cloud.height },
        start: now(),
      };
      kick();
    },

    /** «Seguir»: Pip appears at the start of the next challenge. */
    placeAt(x: number) {
      buttonJump = null;
      body = createBody(x);
      draw();
    },

    /** The right cloud bursts and the door opens. */
    celebrate(challenge: number, option: number) {
      const start = now();
      burst = { challenge, option, start };
      door = { challenge, start };
      kick();
    },

    dispose() {
      if (frame !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(frame);
      }
      frame = null;
    },

    /** For the canvas size: logical units are VIEW_WIDTH × VIEW_HEIGHT. */
    viewSize: { width: VIEW_WIDTH, height: VIEW_HEIGHT },
  };
}

export type PlatformerController = ReturnType<typeof createController>;
