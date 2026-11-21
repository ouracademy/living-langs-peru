import {
  clearDraft,
  type DraftStorage,
  draftFromText,
  readDraftText,
  writeDraft,
} from "@/lib/language-packs/draft-storage";
import type { LanguagePack } from "@/lib/language-packs/types";

/**
 * The pack in preparation, per language, for `useSyncExternalStore`: memory
 * first, with a copy in localStorage (spec §9.1, AC-SP6-13). When the browser
 * refuses the copy the pack stays in memory and the page says so.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
/** Packs kept only in memory, because localStorage refused them. */
const memory = new Map<string, LanguagePack | null>();
/** Last text read per language, so a snapshot keeps its identity. */
const cache = new Map<
  string,
  { text: string | null; pack: LanguagePack | null }
>();

function storage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeDrafts(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith("living-langs:pack-admin:")) listener();
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

export function getDraft(language: string): LanguagePack | null {
  if (memory.has(language)) return memory.get(language) ?? null;

  const text = readDraftText(storage(), language);
  const cached = cache.get(language);
  if (cached && cached.text === text) return cached.pack;

  const pack = draftFromText(text);
  cache.set(language, { text, pack });
  return pack;
}

/** Nothing on the server: the pack in preparation exists only in the browser. */
export function getServerDraft(): LanguagePack | null {
  return null;
}

/** Keeps the pack. Returns whether a copy survives closing the tab. */
export function setDraft(language: string, pack: LanguagePack): boolean {
  const saved = writeDraft(storage(), language, pack);
  if (saved) memory.delete(language);
  else memory.set(language, pack);
  notify();
  return saved;
}

/** «Descartar». */
export function discardDraft(language: string): void {
  clearDraft(storage(), language);
  memory.delete(language);
  cache.delete(language);
  notify();
}
