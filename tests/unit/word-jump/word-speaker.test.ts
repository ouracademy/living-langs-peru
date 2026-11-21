import { describe, expect, it, vi } from "vitest";

import {
  type SpeechEnv,
  createWordSpeaker,
} from "@/components/word-jump/word-speaker";

type Utterance = { text: string; lang: string; voice: unknown };

function fakeEnv(voices: { lang: string; name: string }[] = []) {
  const spoken: Utterance[] = [];
  const played: string[] = [];
  const listeners: (() => void)[] = [];
  let list = voices;
  let refusePlay = false;

  const speechSynthesis = {
    getVoices: () => list,
    speak: vi.fn((utterance: Utterance) => spoken.push(utterance)),
    cancel: vi.fn(),
    addEventListener: (_: "voiceschanged", listener: () => void) =>
      listeners.push(listener),
    removeEventListener: vi.fn(),
  };

  class FakeUtterance {
    lang = "";
    voice: unknown = null;
    constructor(public text: string) {}
  }

  const pause = vi.fn();
  class FakeAudio {
    constructor(public src: string) {}
    play() {
      played.push(this.src);
      return refusePlay
        ? Promise.reject(new Error("NotAllowedError"))
        : Promise.resolve();
    }
    pause = pause;
  }

  const env = {
    speechSynthesis,
    SpeechSynthesisUtterance: FakeUtterance,
    Audio: FakeAudio,
  } as unknown as SpeechEnv;

  return {
    env,
    spoken,
    played,
    speechSynthesis,
    pause,
    refuse: () => {
      refusePlay = true;
    },
    listVoices: (next: { lang: string; name: string }[]) => {
      list = next;
      for (const listener of listeners) listener();
    },
  };
}

const voicePlan = { kind: "voice", text: "PRUEBA uno", lang: "es-PE" } as const;
const recordingPlan = {
  kind: "recording",
  url: "https://example.invalid/audio/a.mp3",
} as const;

describe("createWordSpeaker", () => {
  // AC-SP4c-6
  it("says nothing before the first gesture", () => {
    const fake = fakeEnv([{ lang: "es-PE", name: "Perú" }]);
    const speaker = createWordSpeaker(fake.env);

    expect(speaker.speak(voicePlan)).toBe("before_gesture");
    expect(fake.spoken).toEqual([]);
  });

  // AC-SP4c-2
  it("speaks with the es-PE voice, cancelling what was sounding", () => {
    const fake = fakeEnv([
      { lang: "es-ES", name: "España" },
      { lang: "es-PE", name: "Perú" },
    ]);
    const speaker = createWordSpeaker(fake.env);
    speaker.unlock();

    expect(speaker.speak(voicePlan)).toBe("played");
    expect(fake.speechSynthesis.cancel).toHaveBeenCalled();
    expect(fake.spoken).toHaveLength(1);
    expect(fake.spoken[0]).toMatchObject({ text: "PRUEBA uno", lang: "es-PE" });
    expect((fake.spoken[0].voice as { name: string }).name).toBe("Perú");
  });

  // AC-SP4c-1
  it("plays a recording with Audio and never with the voice", () => {
    const fake = fakeEnv([{ lang: "es-PE", name: "Perú" }]);
    const speaker = createWordSpeaker(fake.env);
    speaker.unlock();

    expect(speaker.speak(recordingPlan)).toBe("played");
    expect(fake.played).toEqual([recordingPlan.url]);
    expect(fake.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it("stops the previous recording before the next word", () => {
    const fake = fakeEnv();
    const speaker = createWordSpeaker(fake.env);
    speaker.unlock();

    speaker.speak(recordingPlan);
    speaker.speak(recordingPlan);
    expect(fake.pause).toHaveBeenCalledTimes(1);
  });

  it("takes a refused recording as silence, not an error", async () => {
    const fake = fakeEnv();
    fake.refuse();
    const speaker = createWordSpeaker(fake.env);
    speaker.unlock();

    expect(speaker.speak(recordingPlan)).toBe("played");
    await Promise.resolve();
    await Promise.resolve();
    speaker.cancel();
    expect(fake.pause).not.toHaveBeenCalled();
  });

  // AC-SP4c-5
  it("knows when the browser has no voice at all, or none in Spanish", () => {
    expect(createWordSpeaker({}).voiceStatus("es-PE")).toBe("unsupported");
    expect(createWordSpeaker({}).speak(voicePlan)).toBe("before_gesture");

    const noSynthesis = createWordSpeaker({});
    noSynthesis.unlock();
    expect(noSynthesis.speak(voicePlan)).toBe("unsupported");

    const fake = fakeEnv([{ lang: "en-US", name: "English" }]);
    const speaker = createWordSpeaker(fake.env);
    speaker.unlock();
    expect(speaker.voiceStatus("es-PE")).toBe("missing");
    expect(speaker.speak(voicePlan)).toBe("no_voice");
    expect(fake.spoken).toEqual([]);
  });

  it("waits for the voices to be listed, and hears when they are", () => {
    const fake = fakeEnv([]);
    const changed = vi.fn();
    const speaker = createWordSpeaker(fake.env, changed);

    expect(speaker.voiceStatus("es-PE")).toBe("loading");
    fake.listVoices([{ lang: "es-MX", name: "México" }]);
    expect(changed).toHaveBeenCalled();
    expect(speaker.voiceStatus("es-PE")).toBe("available");
  });

  it("speaks even before the voices are listed, with the language alone", () => {
    const fake = fakeEnv([]);
    const speaker = createWordSpeaker(fake.env);
    speaker.unlock();

    expect(speaker.speak(voicePlan)).toBe("played");
    expect(fake.spoken[0]).toMatchObject({ lang: "es-PE", voice: null });
  });

  it("says nothing for a plan that says nothing", () => {
    const speaker = createWordSpeaker(fakeEnv().env);
    speaker.unlock();
    expect(speaker.speak({ kind: "none", reason: "voice_off" })).toBe("silent");
  });

  it("stops and stops listening when disposed", () => {
    const fake = fakeEnv([{ lang: "es-PE", name: "Perú" }]);
    const speaker = createWordSpeaker(fake.env);
    speaker.dispose();
    expect(fake.speechSynthesis.cancel).toHaveBeenCalled();
    expect(fake.speechSynthesis.removeEventListener).toHaveBeenCalled();
  });
});
