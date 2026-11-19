"use client";

import { useEffect, useRef } from "react";

import {
  type JumpOutcome,
  jumpPoint,
  jumpProgress,
  platformCenters,
  startPoint,
} from "@/lib/word-jump/jump";

const WIDTH = 600;
const HEIGHT = 260;

type JumpCanvasProps = {
  platforms: number;
  /** The platform jumped to, or null while the character waits. */
  target: number | null;
  outcome: JumpOutcome | null;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Decorative (decision #10): `aria-hidden`, and everything it shows is also in
 * the DOM. The geometry lives in `@/lib/word-jump/jump`; this only paints.
 */
export function JumpCanvas({ platforms, target, outcome }: JumpCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    const centers = platformCenters(WIDTH, HEIGHT, platforms);
    const from = startPoint(WIDTH, HEIGHT);

    function paint(t: number) {
      if (!context) return;
      context.clearRect(0, 0, WIDTH, HEIGHT);
      context.fillStyle = "#1B98A0";
      for (const center of centers) {
        context.fillRect(center.x - 60, center.y, 120, 14);
      }
      const at =
        target === null || outcome === null
          ? from
          : jumpPoint(from, centers[target], t, outcome);
      context.fillStyle = "#E4572E";
      context.beginPath();
      context.arc(at.x, at.y - 18, 18, 0, Math.PI * 2);
      context.fill();
    }

    if (target === null || outcome === null || prefersReducedMotion()) {
      // Reduced motion: no jump, only the end state (spec §7.3).
      paint(1);
      return;
    }

    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = jumpProgress(now - started);
      paint(t);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [platforms, target, outcome]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      aria-hidden="true"
      className="h-auto w-full rounded-[20px] bg-[#FFF7E8]"
    />
  );
}
