/**
 * The only place that touches `speechSynthesis` and `Audio` (spec §7.7).
 * What to say is decided in src/lib/word-jump/speech.ts; this just does it,
 * never throws, and stays quiet until the first gesture, as browsers require.
 * Everything comes from `env`, `window` in the browser, a double in tests.
 */
import {
  type SpeechPlan,
  type VoiceLike,
  pickVoice,
} from "@/lib/word-jump/speech";

type UtteranceLike = { lang: string; voice: unknown };

type SynthesisLike = {
  getVoices: () => VoiceLike[];
  speak: (utterance: UtteranceLike) => void;
  cancel: () => void;
  addEventListener?: (type: "voiceschanged", listener: () => void) => void;
  removeEventListener?: (type: "voiceschanged", listener: () => void) => void;
};

type AudioLike = { play: () => Promise<void> | void; pause: () => void };

export type SpeechEnv = {
  speechSynthesis?: SynthesisLike;
  SpeechSynthesisUtterance?: new (text: string) => UtteranceLike;
  Audio?: new (src: string) => AudioLike;
};

/**
 * Whether the browser can say a word with a voice of `lang`:
 * `loading` while it has not listed its voices yet.
 */
export type VoiceStatus = "loading" | "available" | "missing" | "unsupported";

/** What happened to a request: only `played` made a sound. */
export type SpeakResult =
  "played" | "silent" | "before_gesture" | "unsupported" | "no_voice";

/** `window` in a browser; on the server, nothing that can speak. */
function browserEnv(): SpeechEnv {
  return globalThis as unknown as SpeechEnv;
}

/** The voice status as the browser reports it right now, for a first render. */
export function readVoiceStatus(
  lang: string,
  env: SpeechEnv = browserEnv(),
): VoiceStatus {
  if (!env.speechSynthesis || !env.SpeechSynthesisUtterance) {
    return "unsupported";
  }
  const voices = env.speechSynthesis.getVoices();
  if (voices.length === 0) return "loading";
  return pickVoice(voices, lang) ? "available" : "missing";
}

export function createWordSpeaker(
  env: SpeechEnv = browserEnv(),
  onVoicesChanged: () => void = () => undefined,
) {
  const synthesis = env.speechSynthesis;
  let unlocked = false;
  let voicesListed = false;
  let audio: AudioLike | null = null;

  const listVoices = (): VoiceLike[] => {
    const voices = synthesis?.getVoices() ?? [];
    if (voices.length > 0) voicesListed = true;
    return voices;
  };

  const onVoices = () => {
    voicesListed = true;
    onVoicesChanged();
  };
  synthesis?.addEventListener?.("voiceschanged", onVoices);

  function stop() {
    synthesis?.cancel();
    audio?.pause();
    audio = null;
  }

  return {
    /** Call from a key, pointer or click handler. */
    unlock() {
      unlocked = true;
    },

    voiceStatus(lang: string): VoiceStatus {
      if (!synthesis || !env.SpeechSynthesisUtterance) return "unsupported";
      const voices = listVoices();
      if (pickVoice(voices, lang)) return "available";
      return voicesListed ? "missing" : "loading";
    },

    /** Stops whatever was sounding and says `plan`. */
    speak(plan: SpeechPlan): SpeakResult {
      if (plan.kind === "none") return "silent";
      if (!unlocked) return "before_gesture";
      stop();

      if (plan.kind === "recording") {
        if (!env.Audio) return "unsupported";
        const player = new env.Audio(plan.url);
        audio = player;
        // A browser can still refuse to play; that is a silent word, not an
        // error the player should see.
        void Promise.resolve(player.play()).catch(() => {
          if (audio === player) audio = null;
        });
        return "played";
      }

      const Utterance = env.SpeechSynthesisUtterance;
      if (!synthesis || !Utterance) return "unsupported";
      const voice = pickVoice(listVoices(), plan.lang);
      if (!voice && voicesListed) return "no_voice";
      const utterance = new Utterance(plan.text);
      utterance.lang = voice?.lang ?? plan.lang;
      if (voice) utterance.voice = voice;
      synthesis.speak(utterance);
      return "played";
    },

    cancel: stop,

    dispose() {
      stop();
      synthesis?.removeEventListener?.("voiceschanged", onVoices);
    },
  };
}

export type WordSpeaker = ReturnType<typeof createWordSpeaker>;
