import { hash } from "../game/hash.ts";
import type { LanguagePack, PackItem, Theme } from "./types.ts";

/**
 * The form two words are compared in: NFC (a composed «á» and «a» + combining
 * acute are the same letter, AC-SP1-9), trimmed and lower-cased.
 */
export function normalizeWord(word: string): string {
  return word.normalize("NFC").trim().toLocaleLowerCase("es");
}

function tidy(text: string): string {
  return text.normalize("NFC").trim();
}

function tidyOptional(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const tidied = tidy(text);
  return tidied === "" ? undefined : tidied;
}

/**
 * A new id derived from the item itself, so cleaning is deterministic and
 * idempotent: no clock, no randomness.
 */
function newId(theme: Theme, item: PackItem, taken: Set<string>): string {
  const base = `item-${hash(`${theme.id}\u0000${normalizeWord(item.word)}`).toString(36)}`;
  let candidate = base;

  for (let suffix = 2; taken.has(candidate); suffix++) {
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

function cleanItem(item: PackItem): PackItem {
  const cleaned: PackItem = {
    id: tidy(item.id),
    word: tidy(item.word),
    translation: tidy(item.translation),
    verified: item.verified,
  };

  const optional = {
    emoji: tidyOptional(item.emoji),
    sourceId: tidyOptional(item.sourceId),
    sourceRef: tidyOptional(item.sourceRef),
    audio: tidyOptional(item.audio),
  };

  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) {
      cleaned[key as keyof typeof optional] = value;
    }
  }

  return cleaned;
}

/**
 * Trims, normalises to NFC, drops items with neither word nor translation,
 * gives an id to items without one and renames repeated ids. An existing id is
 * never changed: progress is keyed by it (spec §4.2). Returns a new pack.
 */
export function cleanPack(pack: LanguagePack): LanguagePack {
  // Ids are unique across the whole pack, not per theme: progress is per item.
  const taken = new Set<string>();

  const themes = pack.themes.map((theme) => {
    const items = theme.items
      .map(cleanItem)
      .filter((item) => item.word !== "" || item.translation !== "");

    // First pass keeps every existing id that is still free.
    const keep = items.map((item) => {
      if (item.id !== "" && !taken.has(item.id)) {
        taken.add(item.id);
        return true;
      }
      return false;
    });

    return {
      ...theme,
      items: items.map((item, index) => {
        if (keep[index]) return item;
        const id = newId(theme, item, taken);
        taken.add(id);
        return { ...item, id };
      }),
    };
  });

  return { ...pack, themes };
}
