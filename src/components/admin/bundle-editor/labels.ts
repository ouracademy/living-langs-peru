import type { ThemeMode } from "@/lib/language-bundles/types";

/** Spanish names for what the editor shows. Codes stay in English. */
export const PART_OF_SPEECH_LABELS: Record<string, string> = {
  noun: "Sustantivo",
  verb: "Verbo",
  adjective: "Adjetivo",
  adverb: "Adverbio",
  pronoun: "Pronombre",
  interjection: "Interjección",
  phrase: "Frase",
};

export const MODE_LABELS: Record<ThemeMode, string> = {
  pic2word: "Dibujo → palabra",
  word2pic: "Palabra → dibujo",
  first: "Letra inicial",
  vowel: "Vocal que falta",
  listen: "Escuchar → palabra",
};

export const SOURCE_KIND_LABELS = {
  publication: "Obra publicada",
  speaker: "Persona hablante",
} as const;
