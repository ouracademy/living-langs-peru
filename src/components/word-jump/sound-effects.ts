/**
 * Sound effects made in code with Web Audio (spec §7.6, decision #23): no
 * files, no dependency and no voice — `speechSynthesis` is never used
 * (decision #6). The context is created on the first gesture, as browsers
 * require, and nothing plays while the player has sound turned off.
 */

export type SoundEffect = "jump" | "correct" | "wrong" | "door" | "finish";

type Note = { frequency: number; at: number; length: number };

const SHAPES: Record<SoundEffect, { wave: OscillatorType; notes: Note[] }> = {
  jump: {
    wave: "square",
    notes: [{ frequency: 520, at: 0, length: 0.09 }],
  },
  correct: {
    wave: "triangle",
    notes: [
      { frequency: 660, at: 0, length: 0.1 },
      { frequency: 880, at: 0.1, length: 0.1 },
      { frequency: 1320, at: 0.2, length: 0.18 },
    ],
  },
  wrong: {
    wave: "sawtooth",
    notes: [
      { frequency: 220, at: 0, length: 0.12 },
      { frequency: 170, at: 0.12, length: 0.16 },
    ],
  },
  door: {
    wave: "triangle",
    notes: [
      { frequency: 330, at: 0, length: 0.08 },
      { frequency: 440, at: 0.08, length: 0.12 },
    ],
  },
  finish: {
    wave: "triangle",
    notes: [
      { frequency: 523, at: 0, length: 0.12 },
      { frequency: 659, at: 0.12, length: 0.12 },
      { frequency: 784, at: 0.24, length: 0.12 },
      { frequency: 1047, at: 0.36, length: 0.3 },
    ],
  },
};

type AudioContextConstructor = new () => AudioContext;

function audioContextClass(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return candidate.AudioContext ?? candidate.webkitAudioContext ?? null;
}

export type SoundEffects = {
  /** Call from a key or pointer handler: creates or resumes the context. */
  unlock: () => void;
  play: (effect: SoundEffect) => void;
};

export function createSoundEffects(isOn: () => boolean): SoundEffects {
  let context: AudioContext | null = null;

  function unlock() {
    if (!isOn()) return;
    const Context = audioContextClass();
    if (!Context) return;
    context ??= new Context();
    if (context.state === "suspended") void context.resume();
  }

  function play(effect: SoundEffect) {
    if (!isOn() || !context || context.state !== "running") return;
    const { wave, notes } = SHAPES[effect];
    const start = context.currentTime;

    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0.08, start + note.at);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + note.at + note.length,
      );
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + note.at);
      oscillator.stop(start + note.at + note.length);
    }
  }

  return { unlock, play };
}
