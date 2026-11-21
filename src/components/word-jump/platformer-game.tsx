"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PackItem, Theme } from "@/lib/language-packs/types";
import {
  type LevelState,
  advance,
  answer,
  createLevel,
  solvedCount,
} from "@/lib/word-jump/platformer/game";
import { buildLayout } from "@/lib/word-jump/platformer/level";
import type { RoundContext } from "@/lib/word-jump/round";

import {
  type ControllerOptions,
  type Key,
  type PlatformerController,
  createController,
} from "./platformer-controller";
import { Prompt, QUESTION_TITLES, buttonClass } from "./question-parts";
import { type SoundEffects, createSoundEffects } from "./sound-effects";

type PlatformerGameProps = {
  theme: Theme;
  items: PackItem[];
  context: RoundContext;
  seed: number;
  /** ISO 639-3 of the pack, for every text in the language (spec §7.3). */
  lang: string;
  sourceTitles: Map<string, string>;
  sound: boolean;
  onToggleSound: () => void;
  onFinish: (level: LevelState) => void;
  onExit: () => void;
};

const MOVE_KEYS: Record<string, Key> = {
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  ArrowUp: "jump",
  w: "jump",
  W: "jump",
  " ": "jump",
};

/** Typing in a field, or Space on a button, is not a game key. */
function ignoresGameKeys(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return key === " " && ["BUTTON", "A", "SUMMARY"].includes(target.tagName);
}

const touchClass =
  "flex min-h-14 min-w-14 touch-none items-center justify-center rounded-full bg-[#241D14]/80 text-2xl text-white select-none active:bg-[#241D14]";

/**
 * A touch control for phones (AC-SP4b-9). Out of the tab order and of the
 * accessibility tree: the keyboard has the arrows, and every answer is a
 * real button, so nothing here is the only way to do something.
 */
function TouchButton({
  control,
  onPress,
  children,
}: {
  control: Key;
  onPress: (key: Key, down: boolean) => void;
  children: string;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className={touchClass}
      onPointerDown={(event: ReactPointerEvent) => {
        event.preventDefault();
        onPress(control, true);
      }}
      onPointerUp={() => onPress(control, false)}
      onPointerLeave={() => onPress(control, false)}
      onPointerCancel={() => onPress(control, false)}
    >
      {children}
    </button>
  );
}

/**
 * One level of the platform game (spec §7.6). The canvas is where the level
 * is drawn; every answer is also a real button and every message is in the
 * DOM, so the level can be played without the canvas (decision #25).
 */
export function PlatformerGame({
  theme,
  items,
  context,
  seed,
  lang,
  sourceTitles,
  sound,
  onToggleSound,
  onFinish,
  onExit,
}: PlatformerGameProps) {
  const [level, setLevel] = useState(() => createLevel(items, context, seed));
  const [menuOpen, setMenuOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const soundOn = useRef(sound);
  // Created after mount: they hold the canvas and the audio context.
  const controllerRef = useRef<PlatformerController | null>(null);
  const effectsRef = useRef<SoundEffects | null>(null);

  const optionCounts = level.challenges
    .map((challenge) => challenge.question.options.length)
    .join(",");
  const layout = useMemo(
    () => buildLayout(optionCounts.split(",").map(Number)),
    [optionCounts],
  );

  const onHit = useCallback(
    (option: number) => setLevel((current) => answer(current, option)),
    [],
  );
  const onPassDoor = useCallback(
    () => setLevel((current) => advance(current)),
    [],
  );
  const onJump = useCallback(() => effectsRef.current?.play("jump"), []);

  const options = useRef<ControllerOptions>({
    layout,
    level,
    paused: menuOpen,
    onHit,
    onPassDoor,
    onJump,
  });

  // Mount: the controller (loop, body, keys), the sound and a sharp canvas.
  useEffect(() => {
    const controller = createController(
      () => options.current,
      () => canvasRef.current,
    );
    const effects = createSoundEffects(() => soundOn.current);
    controllerRef.current = controller;
    effectsRef.current = effects;

    const canvas = canvasRef.current;
    if (canvas) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = controller.viewSize.width * ratio;
      canvas.height = controller.viewSize.height * ratio;
    }
    controller.draw();

    // Arrows / A-D move, Space / ↑ / W jump. Released when the window blurs.
    function onKey(event: KeyboardEvent, down: boolean) {
      const key = MOVE_KEYS[event.key];
      if (!key || event.altKey || event.ctrlKey || event.metaKey) return;
      if (ignoresGameKeys(event.target, event.key)) return;
      if (options.current.paused) return;
      event.preventDefault();
      effects.unlock();
      controller.setKey(key, down);
    }
    const keyDown = (event: KeyboardEvent) => onKey(event, true);
    const keyUp = (event: KeyboardEvent) => onKey(event, false);
    const blur = () => controller.releaseAll();
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      controller.dispose();
      controllerRef.current = null;
      effectsRef.current = null;
    };
  }, []);

  // The controller reads the latest props through this ref, set after render.
  useEffect(() => {
    options.current = {
      layout,
      level,
      paused: menuOpen,
      onHit,
      onPassDoor,
      onJump,
    };
    soundOn.current = sound;
    if (menuOpen) controllerRef.current?.releaseAll();
    controllerRef.current?.draw();
  }, [layout, level, menuOpen, onHit, onPassDoor, onJump, sound]);

  const challenge = level.challenges[level.index];
  const question = challenge?.question;
  const solved = challenge?.solved ?? false;
  const last = level.last;

  // Sound, burst and focus follow each answer.
  useEffect(() => {
    if (!last) return;
    if (last.kind === "correct") {
      effectsRef.current?.play("correct");
      effectsRef.current?.play("door");
      controllerRef.current?.celebrate(last.challenge, last.option);
      nextRef.current?.focus();
    } else {
      effectsRef.current?.play("wrong");
      titleRef.current?.focus();
    }
  }, [last]);

  // A new challenge: focus goes back to its question.
  useEffect(() => {
    titleRef.current?.focus();
  }, [level.index]);

  // Reported once: the parent saves the progress and shows the finish.
  const reported = useRef(false);
  useEffect(() => {
    if (level.status !== "finished" || reported.current) return;
    reported.current = true;
    effectsRef.current?.play("finish");
    onFinish(level);
  }, [level, onFinish]);

  const answerWith = useCallback(
    (option: number) => {
      effectsRef.current?.unlock();
      const current = level.challenges[level.index];
      if (
        level.status !== "playing" ||
        !current ||
        current.solved ||
        current.crossed.includes(option)
      ) {
        return;
      }
      controllerRef.current?.jumpTo(option);
      setLevel((state) => answer(state, option));
    },
    [level],
  );

  // Keys 1–4 answer while a challenge is open (aria-keyshortcuts below).
  useEffect(() => {
    if (!question || solved || menuOpen) return;
    const count = question.options.length;

    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= count) return;
      event.preventDefault();
      answerWith(index);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, solved, menuOpen, answerWith]);

  const goOn = useCallback(() => {
    const next = layout.challenges[level.index + 1];
    if (next) controllerRef.current?.placeAt(next.spawnX);
    setLevel((state) => advance(state));
  }, [layout, level.index]);

  const press = useCallback((key: Key, down: boolean) => {
    if (down) effectsRef.current?.unlock();
    controllerRef.current?.setKey(key, down);
  }, []);

  if (!challenge || !question) return null;

  const done = solvedCount(level);
  const source = challenge.item.sourceId
    ? sourceTitles.get(challenge.item.sourceId)
    : undefined;
  const audio = challenge.item.audio;

  return (
    <section aria-labelledby="nivel" className="mt-6">
      <h2 id="nivel" className="sr-only">
        Nivel de {theme.name}
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] bg-[#FFF7E8] px-4 py-2">
        <p
          className="font-bold text-[#241D14]"
          aria-label={`Puntos: ${level.score}. Reto ${Math.min(done + 1, level.challenges.length)} de ${level.challenges.length}.`}
        >
          <span aria-hidden="true">
            ⭐ {level.score} · {Math.min(done + 1, level.challenges.length)}/
            {level.challenges.length}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={sound}
            onClick={onToggleSound}
            className={`${buttonClass} bg-[#FBEFD2] px-4 text-[#241D14] hover:bg-[#F6E3B4]`}
          >
            <span aria-hidden="true">{sound ? "🔊" : "🔇"}</span> Sonido:{" "}
            {sound ? "sí" : "no"}
          </button>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="menu-nivel"
            onClick={() => setMenuOpen((open) => !open)}
            className={`${buttonClass} bg-[#241D14] px-4 text-white hover:bg-[#4A4130]`}
          >
            <span aria-hidden="true">⏸</span> Menú
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="menu-nivel"
          className="mt-3 flex flex-wrap gap-3 rounded-[20px] bg-[#FBEFD2] px-4 py-3"
        >
          <p className="w-full font-bold">Pausa</p>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className={`${buttonClass} bg-[#E4572E] text-white hover:bg-[#C7431C]`}
          >
            Seguir jugando
          </button>
          <button
            type="button"
            onClick={onExit}
            className={`${buttonClass} border-2 border-[#241D14] text-[#241D14]`}
          >
            Elegir otro tema
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-col items-center gap-2 text-center">
        <Prompt question={question} lang={lang} />
        <h3
          ref={titleRef}
          tabIndex={-1}
          className="font-bold focus-visible:outline-2 focus-visible:outline-[#241D14]"
        >
          {QUESTION_TITLES[question.mode]}
        </h3>
        {audio ? (
          <button
            type="button"
            disabled={!sound}
            onClick={() => {
              void new Audio(audio).play();
            }}
            className={`${buttonClass} bg-[#6A3E8C] px-4 text-white disabled:opacity-60`}
          >
            <span aria-hidden="true">🔊</span> Escuchar la palabra
            {sound ? "" : " (sonido apagado)"}
          </button>
        ) : null}
      </div>

      <div className="mt-3 overflow-hidden rounded-[20px] bg-[#9D8DE0]">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          width={640}
          height={360}
          className="block aspect-video h-auto w-full"
        />
      </div>

      <div
        className="mt-3 flex items-center justify-between gap-3"
        aria-hidden="true"
      >
        <div className="flex gap-3">
          <TouchButton control="left" onPress={press}>
            ◀
          </TouchButton>
          <TouchButton control="right" onPress={press}>
            ▶
          </TouchButton>
        </div>
        <TouchButton control="jump" onPress={press}>
          ⤒
        </TouchButton>
      </div>
      <p className="mt-2 text-center text-sm text-[#4A4130]">
        Muévete con las flechas y salta con espacio, o elige la respuesta con
        los botones o las teclas 1, 2 y 3.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {question.options.map((option, index) => {
          const crossed = challenge.crossed.includes(index);
          const isAnswer = solved && index === question.answerIndex;
          const name = option.label ?? option.text;

          return (
            <button
              key={option.itemId ?? `${index}:${option.text}`}
              type="button"
              lang={question.optionsInLanguage ? lang : undefined}
              aria-label={crossed ? `${name} (tachada)` : option.label}
              aria-keyshortcuts={String(index + 1)}
              disabled={solved || crossed}
              onClick={() => answerWith(index)}
              className={`${buttonClass} ${
                question.optionsInLanguage ? "" : "text-3xl"
              } ${
                isAnswer
                  ? "border-4 border-[#1B98A0] bg-[#241D14] text-white"
                  : crossed
                    ? "border-4 border-dashed border-[#C7431C] bg-[#C9C3D6] text-[#241D14] line-through"
                    : "bg-[#241D14] text-white hover:bg-[#4A4130]"
              } disabled:cursor-default`}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      <div role="status" className="mt-4">
        {last?.kind === "wrong" && !solved ? (
          <p className="rounded-[20px] bg-[#FBEFD2] px-6 py-4 font-bold">
            ✗ No es esa. Prueba otra nube.
          </p>
        ) : null}
        {solved ? (
          <div className="rounded-[20px] bg-[#FBEFD2] px-6 py-5">
            <p className="text-lg font-bold">
              ✓ ¡Correcto! La puerta está abierta.
            </p>
            <p className="mt-2">
              <span lang={lang} className="font-bold">
                {challenge.item.word}
              </span>
              : {challenge.item.translation}.
            </p>
            {challenge.item.verified ? null : (
              // Only reachable from «Probar» in /admin/juego: the public game
              // filters unverified items out before they get here (decision #4).
              <p className="mt-1 text-sm font-bold text-[#C7431C]">
                ⚠ Sin verificar
              </p>
            )}
            {source ? (
              <p className="mt-1 text-sm text-[#4A4130]">
                Fuente: {source}
                {challenge.item.sourceRef
                  ? `, ${challenge.item.sourceRef}`
                  : ""}
              </p>
            ) : null}
            <button
              ref={nextRef}
              type="button"
              onClick={goOn}
              className={`${buttonClass} mt-4 bg-[#E4572E] text-white hover:bg-[#C7431C]`}
            >
              Seguir
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
