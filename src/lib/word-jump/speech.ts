/**
 * What sounds when a word is said (spec §7.7, decision #6 as of 2026-11-21):
 * the speaker's recording first; otherwise the browser voice, as a stopgap
 * the player can turn off. Pure: the browser is reached in
 * src/components/word-jump/word-speaker.ts.
 */
import type {
  LanguagePack,
  PackItem,
  PackTts,
} from "../language-packs/types.ts";

/** A pack without a `tts` block: approximate, with a Peruvian Spanish voice. */
export const DEFAULT_TTS: PackTts = Object.freeze({
  lang: "es-PE",
  quality: "approx",
}) as PackTts;

export function ttsOf(
  language: Pick<LanguagePack["language"], "tts">,
): PackTts {
  return language.tts ?? DEFAULT_TTS;
}

/** The pack's text replacements, in order. An empty search is skipped. */
export function applyReplacements(
  text: string,
  replace: PackTts["replace"],
): string {
  let result = text;
  for (const [from, to] of replace ?? []) {
    if (from !== "") result = result.split(from).join(to);
  }
  return result;
}

/** The bits of a browser voice this needs: `SpeechSynthesisVoice` fits. */
export type VoiceLike = { lang: string; name: string };

const tagOf = (lang: string) => lang.trim().toLowerCase().replace(/_/g, "-");
const baseOf = (lang: string) => tagOf(lang).split("-")[0] ?? "";

/** The exact tag first (es-PE), then any voice of the same language (es-*). */
export function pickVoice<V extends VoiceLike>(
  voices: readonly V[],
  lang: string,
): V | null {
  const wanted = tagOf(lang);
  const exact = voices.find((voice) => tagOf(voice.lang) === wanted);
  if (exact) return exact;
  const base = baseOf(lang);
  return voices.find((voice) => baseOf(voice.lang) === base) ?? null;
}

export type SpeechPlan =
  | { kind: "recording"; url: string }
  | { kind: "voice"; text: string; lang: string }
  | {
      kind: "none";
      reason: "sound_off" | "voice_off" | "tts_off" | "nothing_to_say";
    };

export type SpeechRequest = {
  item: Pick<PackItem, "word" | "audio">;
  tts: PackTts;
  /** The game's sound switch (`settings.sound`). */
  sound: boolean;
  /** The player's «Voz aproximada» switch (`settings.voice`). */
  voice: boolean;
};

/** Decides what saying `item` means right now. */
export function planSpeech({
  item,
  tts,
  sound,
  voice,
}: SpeechRequest): SpeechPlan {
  if (!sound) return { kind: "none", reason: "sound_off" };
  if (item.audio) return { kind: "recording", url: item.audio };
  if (tts.quality === "off") return { kind: "none", reason: "tts_off" };
  if (!voice) return { kind: "none", reason: "voice_off" };

  const text = applyReplacements(item.word, tts.replace).trim();
  if (text === "") return { kind: "none", reason: "nothing_to_say" };
  return { kind: "voice", text, lang: tts.lang };
}
