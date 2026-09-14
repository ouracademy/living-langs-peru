"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * True once the component has hydrated on the client.
 *
 * Via `useSyncExternalStore` with constant snapshots rather than an effect
 * that sets state: same result, no cascading render, and it is the API for a
 * value that differs between the server render and the client.
 *
 * Used to mark the start button as wired. The button works without this — it
 * is in the static HTML — but until React has attached its handler a click
 * does nothing, and both a person clicking fast and a test need a way to know.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, onClient, onServer);
}
