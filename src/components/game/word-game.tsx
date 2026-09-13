"use client";

import { useState } from "react";

import type { Source } from "@/lib/dictionary";
import { orderOptions } from "@/lib/game/options";
import type { Item } from "@/lib/game/types";

import { LessonView } from "./lesson-view";

type WordGameProps = {
  /** The whole pool. Which items a lesson uses is decided on the client. */
  items: Item[];
  languageCode: string;
  sources: Source[];
};

/**
 * Owns the game state and orchestrates the screens.
 *
 * The lesson is composed on the client, never on the server: shuffling during
 * render would mismatch the prerendered HTML, and the saved progress that
 * feeds the choice only exists in the browser.
 */
export function WordGame({ items, languageCode }: WordGameProps) {
  const [seed] = useState(1);
  const item = items[0];
  const options = orderOptions(item, seed);

  return (
    <LessonView
      item={item}
      options={options}
      languageCode={languageCode}
      onSelect={() => {}}
    />
  );
}
