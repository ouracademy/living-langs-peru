"use client";

import { useEffect } from "react";

import { GameUnavailable } from "@/components/word-jump/game-unavailable";

/**
 * Reached only when the very first read of a language fails (nothing cached
 * yet). Error boundaries must be client components — the one exception to the
 * `"use client"` rule of spec §11.3. Not cached: the next visit retries.
 */
export default function WordJumpError({ error }: { error: Error }) {
  useEffect(() => {
    // The digest only; the message never carries pack data, but stay terse.
    console.error(
      "word-jump: page failed",
      (error as { digest?: string }).digest,
    );
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        El juego no está disponible ahora
      </h1>
      <GameUnavailable />
    </main>
  );
}
