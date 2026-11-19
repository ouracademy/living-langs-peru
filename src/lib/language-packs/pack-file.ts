import { cleanPack } from "./clean.ts";
import { parsePack } from "./schema.ts";
import type { LanguagePack } from "./types.ts";

/** A note longer than this is refused: it is a line in the history. */
export const MAX_NOTE_LENGTH = 500;

export type ImportResult =
  { ok: true; pack: LanguagePack } | { ok: false; problems: string[] };

/**
 * An imported `.json`, as /admin/juego takes it (spec §9.1): parsed, checked
 * against the schema and cleaned. What does not parse is refused whole, so the
 * pack in preparation never changes halfway (AC-SP6-4).
 */
export function importPackText(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      problems: ["El archivo no es un JSON válido. Revisa que esté completo."],
    };
  }

  const parsed = parsePack(data);
  if (!parsed.ok) return { ok: false, problems: parsed.issues };

  return { ok: true, pack: cleanPack(parsed.pack) };
}

/** The pack as a file again. Importing this text gives the same pack (AC-SP6-3). */
export function exportPackText(pack: LanguagePack): string {
  return `${JSON.stringify(pack, null, 2)}\n`;
}

export type PackSummary = {
  themes: number;
  items: number;
  unverified: number;
  withoutAudio: number;
};

/** What the status line counts before publishing (spec §9.1, §9.2). */
export function summarizePack(pack: LanguagePack): PackSummary {
  const items = pack.themes.flatMap((theme) => theme.items);
  return {
    themes: pack.themes.length,
    items: items.length,
    unverified: items.filter((item) => !item.verified).length,
    withoutAudio: items.filter((item) => !item.audio).length,
  };
}

/** Anchor id of an item in the /admin/juego list, so an issue can link to it. */
export function itemAnchor(themeId: string, itemId?: string): string {
  const safe = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "_");
  return itemId
    ? `item-${safe(themeId)}-${safe(itemId)}`
    : `tema-${safe(themeId)}`;
}

/** File name of a downloaded pack: `ashaninka-v3.json`, `ashaninka-borrador.json`. */
export function packFileName(language: string, version?: number): string {
  return version === undefined
    ? `${language}-borrador.json`
    : `${language}-v${version}.json`;
}
