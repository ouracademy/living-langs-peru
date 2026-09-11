"use client";

import { useEffect, useState } from "react";

/**
 * Lags a fast-changing value so filtering does not run on every keystroke.
 * The input itself stays immediate; only the derived query waits.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
