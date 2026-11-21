import { describe, expect, it } from "vitest";

import type { PackItem } from "@/lib/language-packs/types";
import {
  DEFAULT_TTS,
  applyReplacements,
  pickVoice,
  planSpeech,
  ttsOf,
} from "@/lib/word-jump/speech";

const item = (extra: Partial<PackItem> = {}): PackItem => ({
  id: "prueba-uno",
  word: "PRUEBA uno",
  translation: "prueba",
  verified: true,
  ...extra,
});

const voice = (lang: string, name = lang) => ({ lang, name });

describe("ttsOf", () => {
  it("defaults to an approximate es-PE voice when the pack has no block", () => {
    expect(ttsOf({})).toEqual({ lang: "es-PE", quality: "approx" });
    expect(DEFAULT_TTS).toEqual({ lang: "es-PE", quality: "approx" });
  });

  it("uses the pack's block when there is one", () => {
    const tts = { lang: "es-419", quality: "off" as const };
    expect(ttsOf({ tts })).toBe(tts);
  });
});

describe("applyReplacements", () => {
  it("replaces every occurrence, in order", () => {
    expect(
      applyReplacements("PRUEBA'uno'", [
        ["'", ""],
        ["uno", "dos"],
      ]),
    ).toBe("PRUEBAdos");
  });

  it("leaves the text alone without replacements, or with an empty search", () => {
    expect(applyReplacements("PRUEBA", undefined)).toBe("PRUEBA");
    expect(applyReplacements("PRUEBA", [["", "x"]])).toBe("PRUEBA");
  });
});

describe("pickVoice", () => {
  it("prefers the exact tag, ignoring case and - or _", () => {
    const voices = [voice("es-ES"), voice("es_pe", "Perú"), voice("en-US")];
    expect(pickVoice(voices, "es-PE")?.name).toBe("Perú");
  });

  it("falls back to any voice of the same base language", () => {
    expect(pickVoice([voice("en-US"), voice("es-MX")], "es-PE")?.lang).toBe(
      "es-MX",
    );
  });

  it("finds nothing without a voice of that language", () => {
    expect(pickVoice([voice("en-US"), voice("fr-FR")], "es-PE")).toBeNull();
    expect(pickVoice([], "es-PE")).toBeNull();
  });
});

describe("planSpeech", () => {
  const on = { sound: true, voice: true };

  // AC-SP4c-1
  it("plays the recording whenever the item has one, even with the voice off", () => {
    const recorded = item({ audio: "https://example.invalid/audio/a.mp3" });
    const expected = {
      kind: "recording",
      url: "https://example.invalid/audio/a.mp3",
    };
    expect(planSpeech({ item: recorded, tts: DEFAULT_TTS, ...on })).toEqual(
      expected,
    );
    expect(
      planSpeech({
        item: recorded,
        tts: { lang: "es-PE", quality: "off" },
        sound: true,
        voice: false,
      }),
    ).toEqual(expected);
  });

  // AC-SP4c-2
  it("speaks the word with the browser voice when there is no recording", () => {
    expect(
      planSpeech({
        item: item({ word: "PRUEBA'uno" }),
        tts: { lang: "es-PE", quality: "approx", replace: [["'", ""]] },
        ...on,
      }),
    ).toEqual({ kind: "voice", text: "PRUEBAuno", lang: "es-PE" });
  });

  // AC-SP4c-4
  it("stays silent when the player turned the voice off or the pack turned it off", () => {
    expect(
      planSpeech({ item: item(), tts: DEFAULT_TTS, sound: true, voice: false }),
    ).toEqual({
      kind: "none",
      reason: "voice_off",
    });
    expect(
      planSpeech({
        item: item(),
        tts: { lang: "es-PE", quality: "off" },
        ...on,
      }),
    ).toEqual({ kind: "none", reason: "tts_off" });
  });

  // AC-SP4c-6
  it("never sounds with the sound off, not even a recording", () => {
    expect(
      planSpeech({
        item: item({ audio: "https://example.invalid/audio/a.mp3" }),
        tts: DEFAULT_TTS,
        sound: false,
        voice: true,
      }),
    ).toEqual({ kind: "none", reason: "sound_off" });
  });

  it("does not speak a word that is empty once trimmed", () => {
    expect(
      planSpeech({ item: item({ word: "  " }), tts: DEFAULT_TTS, ...on }),
    ).toEqual({ kind: "none", reason: "nothing_to_say" });
  });
});
