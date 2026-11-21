import { languages } from "../languages.ts";
import { normalizeWord } from "./clean.ts";
import { initialGrapheme, vowelSlots } from "./graphemes.ts";
import { playableThemes } from "./playable.ts";
import type { GameMode, LanguagePack, PackItem, Theme } from "./types.ts";

/** A serialized pack this size or bigger is refused (spec §4.3, AC-SP3-6). */
export const MAX_PACK_BYTES = 2 * 1024 * 1024;

export type IssueCode =
  // Errors: they block publishing.
  | "unknown_language"
  | "language_mismatch"
  | "unknown_source"
  | "audio_outside_bucket"
  | "duplicate_word"
  | "pack_too_large"
  | "invalid_tts"
  // Warnings: they explain what stays out of the game.
  | "missing_emoji"
  | "initial_not_in_graphemes"
  | "no_vowel"
  | "unverified"
  | "theme_not_playable";

/**
 * One problem. `themeId` and `itemId` say where, when it is in a theme or an
 * item; a problem of the whole pack (its language, its size) has neither.
 */
export type Issue = {
  code: IssueCode;
  message: string;
  themeId?: string;
  itemId?: string;
};

export type PackValidation = { errors: Issue[]; warnings: Issue[] };

export type ValidateOptions = {
  /** Public URL of the project's `audio` bucket, passed in to keep this pure. */
  audioBaseUrl: string;
  /** The language chosen in /admin/juego, when there is one. */
  language?: string;
};

/**
 * Modes that cannot ask about an item without its emoji. `first` is not one of
 * them: without a picture it shows the meaning instead (questions.ts `hint`),
 * so a missing emoji there is not worth a warning per word.
 */
const USES_EMOJI: ReadonlySet<GameMode> = new Set(["pic2word", "word2pic"]);

const MODE_NAMES: Record<GameMode, string> = {
  pic2word: "dibujo → palabra",
  listen: "escuchar → palabra",
  word2pic: "palabra → dibujo",
  first: "letra inicial",
  vowel: "vocal que falta",
};

function itemIssue(
  code: IssueCode,
  theme: Theme,
  item: PackItem,
  message: string,
): Issue {
  return { code, message, themeId: theme.id, itemId: item.id };
}

/** Whether `url` lives inside the bucket, not merely starts like it. */
function insideBucket(url: string, audioBaseUrl: string): boolean {
  const base = `${audioBaseUrl.replace(/\/+$/, "")}/`;
  return base.startsWith("https://") && url.startsWith(base);
}

/** A language tag the browser can match a voice against: es, es-PE, es-419. */
const LANGUAGE_TAG = /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/;

/** The optional browser-voice block (spec §4.3, §7.7). */
function ttsErrors(tts: LanguagePack["language"]["tts"]): Issue[] {
  if (!tts) return [];
  const errors: Issue[] = [];

  if (!LANGUAGE_TAG.test(tts.lang.trim())) {
    errors.push({
      code: "invalid_tts",
      message: `La voz «${tts.lang}» no es un idioma válido. Usa algo como «es-PE».`,
    });
  }
  if ((tts.replace ?? []).some(([from]) => from === "")) {
    errors.push({
      code: "invalid_tts",
      message: "Una sustitución de la voz no dice qué texto reemplazar.",
    });
  }
  return errors;
}

function packErrors(pack: LanguagePack, options: ValidateOptions): Issue[] {
  const errors: Issue[] = [];
  const { slug } = pack.language;

  if (!languages.some((language) => language.slug === slug)) {
    errors.push({
      code: "unknown_language",
      message: `La lengua «${slug}» no está en la lista del sitio.`,
    });
  }
  if (options.language !== undefined && options.language !== slug) {
    errors.push({
      code: "language_mismatch",
      message: `El paquete es de «${slug}», pero estás editando «${options.language}».`,
    });
  }

  errors.push(...ttsErrors(pack.language.tts));

  const bytes = new TextEncoder().encode(JSON.stringify(pack)).length;
  if (bytes >= MAX_PACK_BYTES) {
    errors.push({
      code: "pack_too_large",
      message: "El paquete pesa 2 MB o más. Divídelo o quita contenido.",
    });
  }

  return errors;
}

/**
 * The rules of spec §4.3. Errors block publishing; warnings explain what will
 * not be played and why. Pure: no network, no clock, no storage.
 */
export function validatePack(
  pack: LanguagePack,
  options: ValidateOptions,
): PackValidation {
  const errors = packErrors(pack, options);
  const warnings: Issue[] = [];
  const sourceIds = new Set(pack.sources.map((source) => source.id));
  const playable = new Set(playableThemes(pack).map((theme) => theme.id));

  for (const theme of pack.themes) {
    const words = new Set<string>();

    for (const item of theme.items) {
      if (item.sourceId !== undefined && !sourceIds.has(item.sourceId)) {
        errors.push(
          itemIssue(
            "unknown_source",
            theme,
            item,
            `«${item.word}» cita la fuente «${item.sourceId}», que no está en la lista de fuentes.`,
          ),
        );
      }
      if (
        item.audio !== undefined &&
        !insideBucket(item.audio, options.audioBaseUrl)
      ) {
        errors.push(
          itemIssue(
            "audio_outside_bucket",
            theme,
            item,
            `El audio de «${item.word}» no está en el almacenamiento del proyecto.`,
          ),
        );
      }

      const word = normalizeWord(item.word);
      if (words.has(word)) {
        errors.push(
          itemIssue(
            "duplicate_word",
            theme,
            item,
            `«${item.word}» está repetida en el tema «${theme.name}».`,
          ),
        );
      }
      words.add(word);

      if (USES_EMOJI.has(theme.mode) && (item.emoji ?? "") === "") {
        warnings.push(
          itemIssue(
            "missing_emoji",
            theme,
            item,
            `«${item.word}» no tiene dibujo y el modo ${MODE_NAMES[theme.mode]} lo necesita.`,
          ),
        );
      }
      if (!item.verified) {
        warnings.push(
          itemIssue(
            "unverified",
            theme,
            item,
            `«${item.word}» no está verificada: no aparecerá en el juego.`,
          ),
        );
      }
      if (
        theme.mode === "first" &&
        initialGrapheme(item.word, pack.language.graphemes) === null
      ) {
        warnings.push(
          itemIssue(
            "initial_not_in_graphemes",
            theme,
            item,
            `La letra inicial de «${item.word}» no está en las letras de la lengua.`,
          ),
        );
      }
      if (
        theme.mode === "vowel" &&
        vowelSlots(item.word, pack.language).slots.length === 0
      ) {
        warnings.push(
          itemIssue(
            "no_vowel",
            theme,
            item,
            `«${item.word}» no tiene ninguna vocal de la lengua.`,
          ),
        );
      }
    }

    if (!playable.has(theme.id)) {
      warnings.push({
        code: "theme_not_playable",
        message: `El tema «${theme.name}» no tiene suficientes palabras verificadas para el modo ${MODE_NAMES[theme.mode]}: no aparecerá en el juego.`,
        themeId: theme.id,
      });
    }
  }

  return { errors, warnings };
}
