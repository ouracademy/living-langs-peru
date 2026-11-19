"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

export type FocusRequest = { src: string | null; action: string };

/**
 * Where the focus goes once the list re-renders after a save: a button of a
 * photo (the one moved, edited or next to the removed one), or the notice
 * when there is no photo to land on (`src: null`).
 */
export function useRowFocus(noticeRef: RefObject<HTMLElement | null>) {
  const items = useRef(new Map<string, HTMLLIElement>());
  const [request, setRequest] = useState<FocusRequest | null>(null);

  useEffect(() => {
    if (!request) return;
    if (request.src === null) {
      noticeRef.current?.focus();
      return;
    }
    const item = items.current.get(request.src);
    const wanted = item?.querySelector<HTMLButtonElement>(
      `[data-photo-action="${request.action}"]`,
    );
    // A photo moved to an end: its button in that direction is now disabled.
    const fallback = item?.querySelector<HTMLButtonElement>(
      "[data-photo-action]:not(:disabled)",
    );
    (wanted && !wanted.disabled
      ? wanted
      : (fallback ?? noticeRef.current)
    )?.focus();
  }, [request, noticeRef]);

  /** A ref callback per row, keyed by the photo's `src`. */
  function registerRow(src: string) {
    return (element: HTMLLIElement | null) => {
      if (element) items.current.set(src, element);
      else items.current.delete(src);
    };
  }

  return { requestFocus: setRequest, registerRow };
}
