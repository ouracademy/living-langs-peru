import { cleanPack, normalizeWord } from "./clean.ts";
import { itemAnchor } from "./pack-file.ts";
import type { LanguagePack, PackItem, Theme } from "./types.ts";

/**
 * The minimal editor of /admin/juego (spec §9.5). Pure: every function takes a
 * pack and returns a new one, already through `cleanPack`, so the page only
 * stores the result. Nothing here writes a word: everything comes from a person.
 */

export type ItemPatch = {
  word?: string;
  translation?: string;
  emoji?: string;
  verified?: boolean;
};

export type ItemFields = { word: string; translation: string; emoji: string };

export type FieldErrors = Partial<Record<keyof ItemFields, string>>;

export type NewItem = ItemFields & { sourceId: string; verified: boolean };

export type ItemFilter = {
  query: string;
  unverified: boolean;
  noEmoji: boolean;
};

/** An emoji is short: even a family or a flag stays under this. */
const MAX_EMOJI_LENGTH = 16;

function findItem(
  pack: LanguagePack,
  themeId: string,
  itemId: string,
): PackItem | undefined {
  return pack.themes
    .find((theme) => theme.id === themeId)
    ?.items.find((item) => item.id === itemId);
}

/** Applies `change` to every item, in every theme, written like `word` (E2). */
function forSameWord(
  pack: LanguagePack,
  words: Set<string>,
  change: (item: PackItem) => PackItem,
): LanguagePack {
  return {
    ...pack,
    themes: pack.themes.map((theme) => ({
      ...theme,
      items: theme.items.map((item) =>
        words.has(normalizeWord(item.word)) ? change(item) : item,
      ),
    })),
  };
}

/**
 * Changes one word wherever it appears: a word has one meaning, one picture
 * and one verification, whatever theme shows it (spec §9.5 E2). Ids never
 * change (E3).
 */
export function updateItem(
  pack: LanguagePack,
  themeId: string,
  itemId: string,
  patch: ItemPatch,
): LanguagePack {
  const target = findItem(pack, themeId, itemId);
  if (!target) return pack;

  const updated = forSameWord(
    pack,
    new Set([normalizeWord(target.word)]),
    (item) => {
      const next: PackItem = { ...item };
      if (patch.word !== undefined) next.word = patch.word;
      if (patch.translation !== undefined) next.translation = patch.translation;
      if (patch.verified !== undefined) next.verified = patch.verified;
      if (patch.emoji !== undefined) {
        // An empty emoji means «no picture»: cleanPack drops the key.
        next.emoji = patch.emoji;
      }
      return next;
    },
  );
  return cleanPack(updated);
}

/** «Marcar todas como verificadas» (E6). `changed` counts this theme only. */
export function verifyTheme(
  pack: LanguagePack,
  themeId: string,
): { pack: LanguagePack; changed: number } {
  const theme = pack.themes.find((candidate) => candidate.id === themeId);
  if (!theme) return { pack, changed: 0 };

  const changed = theme.items.filter((item) => !item.verified).length;
  if (changed === 0) return { pack, changed };

  const words = new Set(theme.items.map((item) => normalizeWord(item.word)));
  return {
    pack: cleanPack(
      forSameWord(pack, words, (item) => ({ ...item, verified: true })),
    ),
    changed,
  };
}

/** Adds a word to one theme. Its id comes from `cleanPack` (E3). */
export function addItem(
  pack: LanguagePack,
  themeId: string,
  fields: NewItem,
): { pack: LanguagePack; itemId: string } {
  const draft: PackItem = {
    id: "",
    word: fields.word,
    translation: fields.translation,
    verified: fields.verified,
    ...(fields.emoji.trim() ? { emoji: fields.emoji } : {}),
    ...(fields.sourceId ? { sourceId: fields.sourceId } : {}),
  };

  const cleaned = cleanPack({
    ...pack,
    themes: pack.themes.map((theme) =>
      theme.id === themeId
        ? { ...theme, items: [...theme.items, draft] }
        : theme,
    ),
  });
  const items = cleaned.themes.find((theme) => theme.id === themeId)?.items;
  return { pack: cleaned, itemId: items?.at(-1)?.id ?? "" };
}

/** Takes a word out of one theme; the same word stays in the others. */
export function removeItem(
  pack: LanguagePack,
  themeId: string,
  itemId: string,
): LanguagePack {
  return {
    ...pack,
    themes: pack.themes.map((theme) =>
      theme.id === themeId
        ? { ...theme, items: theme.items.filter((item) => item.id !== itemId) }
        : theme,
    ),
  };
}

/**
 * What a field needs before it is saved (E7). `editingId` is the item being
 * edited, so its own word does not count as a repetition.
 */
export function checkItemFields(
  fields: ItemFields,
  theme: Theme,
  editingId?: string,
): FieldErrors {
  const errors: FieldErrors = {};
  const word = normalizeWord(fields.word);

  if (word === "") {
    errors.word = "Escribe la palabra.";
  } else if (
    theme.items.some(
      (item) => item.id !== editingId && normalizeWord(item.word) === word,
    )
  ) {
    errors.word = `Ya hay una palabra «${fields.word.trim()}» en este tema.`;
  }

  if (fields.translation.trim() === "") {
    errors.translation = "Escribe la traducción.";
  }

  const emoji = fields.emoji.trim();
  if (
    emoji !== "" &&
    (/\p{L}/u.test(emoji) || emoji.length > MAX_EMOJI_LENGTH)
  ) {
    errors.emoji =
      "El dibujo tiene que ser un emoji (por ejemplo 🐟), no texto.";
  }

  return errors;
}

/** Without accents and in lower case, so «sola» finds «SÓLA». */
function searchable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}

/** Search and filters of the list (E4). */
export function filterItems(items: PackItem[], filter: ItemFilter): PackItem[] {
  const query = searchable(filter.query.trim());
  return items.filter(
    (item) =>
      (!filter.unverified || !item.verified) &&
      (!filter.noEmoji || !item.emoji) &&
      (query === "" ||
        searchable(item.word).includes(query) ||
        searchable(item.translation).includes(query)),
  );
}

/** Which theme and item an issue link (`#item-…`, `#tema-…`) points to (E4). */
export function anchorTarget(
  pack: LanguagePack,
  hash: string,
): { themeId: string; itemId?: string } | null {
  const anchor = hash.replace(/^#/, "");
  if (anchor === "") return null;

  for (const theme of pack.themes) {
    if (itemAnchor(theme.id) === anchor) return { themeId: theme.id };
    for (const item of theme.items) {
      if (itemAnchor(theme.id, item.id) === anchor) {
        return { themeId: theme.id, itemId: item.id };
      }
    }
  }
  return null;
}
