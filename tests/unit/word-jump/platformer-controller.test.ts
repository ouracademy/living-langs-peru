import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type ControllerOptions,
  createController,
} from "@/components/word-jump/platformer-controller";
import { createLevel } from "@/lib/word-jump/platformer/game";
import { buildLayout } from "@/lib/word-jump/platformer/level";
import type { RoundContext } from "@/lib/word-jump/round";

import { testTheme } from "../language-packs/fixtures";

const theme = testTheme();
const context: RoundContext = { theme, playable: [theme] };

/** Frames are run by hand: each call to requestAnimationFrame is queued. */
function fakeFrames() {
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      queue.push(callback);
      return queue.length;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  // Same timeline as performance.now(), as in a browser.
  let time = performance.now();
  return {
    requested: () =>
      (
        window.requestAnimationFrame as unknown as {
          mock: { calls: unknown[] };
        }
      ).mock.calls.length,
    /** Runs up to `count` queued frames, 16 ms apart. */
    run(count: number) {
      for (let frame = 0; frame < count && queue.length > 0; frame++) {
        time += 16;
        queue.shift()!(time);
      }
    },
  };
}

function reducedMotion(on: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: on }) as MediaQueryList),
  );
}

function setUp() {
  const level = createLevel(theme.items, context, 3);
  const options: ControllerOptions = {
    layout: buildLayout(level.challenges.map((c) => c.question.options.length)),
    level,
    paused: false,
    onHit: vi.fn(),
    onPassDoor: vi.fn(),
    onJump: vi.fn(),
  };
  const controller = createController(
    () => options,
    () => null,
  );
  return { options, controller };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the level controller", () => {
  // AC-SP4-6
  it("asks for no frame when an answer button is used with reduced motion", () => {
    const frames = fakeFrames();
    reducedMotion(true);
    const { controller } = setUp();

    controller.jumpTo(1);
    controller.celebrate(0, 1);

    expect(frames.requested()).toBe(0);
  });

  it("animates the jump to a cloud otherwise, then stops asking for frames", () => {
    const frames = fakeFrames();
    reducedMotion(false);
    const { controller } = setUp();

    controller.jumpTo(1);
    expect(frames.requested()).toBe(1);
    frames.run(200);
    const asked = frames.requested();
    frames.run(10);
    expect(frames.requested()).toBe(asked);
  });

  // AC-SP4b-2 with physics: under a cloud, a held jump answers it.
  it("answers the cloud the head hits, and reports the jump", () => {
    reducedMotion(true);
    const { controller, options } = setUp();
    controller.jumpTo(2); // Reduced motion: stands right under cloud 2.

    const frames = fakeFrames();
    reducedMotion(false);
    controller.setKey("jump", true);
    frames.run(40);

    expect(options.onJump).toHaveBeenCalled();
    expect(options.onHit).toHaveBeenCalledWith(2);
  });

  it("does not move while paused, and releases every key", () => {
    const frames = fakeFrames();
    reducedMotion(false);
    const { controller, options } = setUp();
    options.paused = true;

    controller.setKey("right", true);
    controller.setKey("jump", true);
    frames.run(30);
    expect(options.onHit).not.toHaveBeenCalled();
    expect(options.onJump).not.toHaveBeenCalled();

    controller.releaseAll();
    controller.dispose();
  });

  // AC-SP4b-4: walking through the open door moves to the next challenge.
  it("reports the door once the body is through it", () => {
    reducedMotion(true);
    const { controller, options } = setUp();
    options.level = {
      ...options.level,
      challenges: options.level.challenges.map((challenge, index) =>
        index === 0 ? { ...challenge, solved: true } : challenge,
      ),
    };
    controller.placeAt(options.layout.challenges[0].doorX - 40);

    const frames = fakeFrames();
    reducedMotion(false);
    controller.setKey("right", true);
    frames.run(60);

    expect(options.onPassDoor).toHaveBeenCalledTimes(1);
  });
});
