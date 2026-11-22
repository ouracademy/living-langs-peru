import {
  BUNDLE_DRAFT_PREFIX,
  type BundleDraftStorage,
  bundleDraftFromText,
  clearBundleDraft,
  readBundleDraftText,
  writeBundleDraft,
} from "@/lib/language-bundles/draft-storage";
import type { LanguageBundle } from "@/lib/language-bundles/types";

/**
 * The working copy, per language, for `useSyncExternalStore`: memory first,
 * with a copy in localStorage. When the browser refuses the copy the bundle
 * stays in memory and the page says so.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
/** Bundles kept only in memory, because localStorage refused them. */
const memory = new Map<string, LanguageBundle>();
/** Last text read per language, so a snapshot keeps its identity. */
const cache = new Map<
  string,
  { text: string | null; bundle: LanguageBundle | null }
>();

function storage(): BundleDraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeBundleDrafts(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(BUNDLE_DRAFT_PREFIX)) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getBundleDraft(language: string): LanguageBundle | null {
  const inMemory = memory.get(language);
  if (inMemory) return inMemory;

  const text = readBundleDraftText(storage(), language);
  const cached = cache.get(language);
  if (cached && cached.text === text) return cached.bundle;

  const bundle = bundleDraftFromText(text);
  cache.set(language, { text, bundle });
  return bundle;
}

/** Nothing on the server: the working copy exists only in the browser. */
export function getServerBundleDraft(): LanguageBundle | null {
  return null;
}

/** Keeps the bundle. Returns whether a copy survives closing the tab. */
export function setBundleDraft(
  language: string,
  bundle: LanguageBundle,
): boolean {
  const saved = writeBundleDraft(storage(), language, bundle);
  if (saved) memory.delete(language);
  else memory.set(language, bundle);
  notify();
  return saved;
}

/** «Descartar». */
export function discardBundleDraft(language: string): void {
  clearBundleDraft(storage(), language);
  memory.delete(language);
  cache.delete(language);
  notify();
}
