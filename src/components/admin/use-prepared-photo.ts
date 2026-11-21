"use client";

import { useEffect, useState } from "react";

import {
  RESIZE_MESSAGES,
  type ResizedPhoto,
  resizeToJpeg,
} from "./resize-image";

export type Prepared =
  | { kind: "none" }
  | { kind: "preparing" }
  | { kind: "ready"; photo: ResizedPhoto; previewUrl: string };

/**
 * The photo of «Agregar foto»: reduced as soon as it is chosen, so the editor
 * sees it as it will be saved (UI-4). Owns the preview's blob URL and releases
 * it when the photo changes or the panel closes: a saved photo is served from
 * the bucket right away, so the list never needs the local copy.
 */
export function usePreparedPhoto(onProblem: (message: string | null) => void) {
  const [prepared, setPrepared] = useState<Prepared>({ kind: "none" });
  const previewUrl = prepared.kind === "ready" ? prepared.previewUrl : null;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function choose(file: File) {
    setPrepared({ kind: "preparing" });
    onProblem(null);
    const resized = await resizeToJpeg(file);
    if (!resized.ok) {
      setPrepared({ kind: "none" });
      onProblem(RESIZE_MESSAGES[resized.problem]);
      return;
    }
    setPrepared({
      kind: "ready",
      photo: resized.photo,
      previewUrl: URL.createObjectURL(resized.photo.blob),
    });
  }

  return {
    prepared,
    choose,
    clear: () => setPrepared({ kind: "none" }),
  };
}
