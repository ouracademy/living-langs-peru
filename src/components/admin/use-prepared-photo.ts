"use client";

import { useEffect, useRef, useState } from "react";

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
 * it, unless it was handed to the list to show while publishing (UI-10).
 */
export function usePreparedPhoto(onProblem: (message: string | null) => void) {
  const [prepared, setPrepared] = useState<Prepared>({ kind: "none" });
  const handedOver = useRef<string | null>(null);
  const previewUrl = prepared.kind === "ready" ? prepared.previewUrl : null;

  useEffect(
    () => () => {
      if (previewUrl && handedOver.current !== previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
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
    handOver: (url: string) => {
      handedOver.current = url;
    },
  };
}
