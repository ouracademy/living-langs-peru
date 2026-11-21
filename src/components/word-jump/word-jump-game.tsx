"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import type { GameMode, PackItem, Theme } from "@/lib/language-packs/types";
import type { PublicPack } from "@/lib/word-jump/game-state";
import {
  type LevelState,
  levelOutcomes,
  missedItems,
} from "@/lib/word-jump/platformer/game";
import { settingOn } from "@/lib/word-jump/progress";
import {
  getServerSnapshot,
  getSnapshot,
  saveRound,
  saveSetting,
  saveSound,
  subscribe,
} from "@/lib/word-jump/progress-store";
import { type RoundContext, buildRound } from "@/lib/word-jump/round";
import { ttsOf } from "@/lib/word-jump/speech";
import type { LanguageProgress } from "@/lib/word-jump/stats";

import { PlatformerGame, type SpeechSetting } from "./platformer-game";
import { buttonClass } from "./question-parts";

type WordJumpGameProps = {
  /** Already filtered by `playableThemes` on the server. */
  pack: PublicPack;
  /**
   * «Probar» in /admin/juego (AC-SP6-10): the pack may hold unverified items,
   * a warning is shown, and nothing is read from or written to the progress.
   */
  preview?: boolean;
};

const MODE_NAMES: Record<GameMode, string> = {
  pic2word: "Dibujo → palabra",
  listen: "Escuchar → palabra",
  word2pic: "Palabra → dibujo",
  first: "Letra inicial",
  vowel: "Vocal que falta",
};

/** Stable identity for a language never played: no fresh object per render. */
const NO_PROGRESS: LanguageProgress = Object.freeze({});

type Play = { theme: Theme; items: PackItem[]; seed: number };

/**
 * Owns the choice of theme, the level and its finish. The level is built on
 * the client, when the player asks for it: shuffling during render would not
 * match the cached HTML. Progress lives only in this browser (spec §7.4).
 */
export function WordJumpGame({ pack, preview = false }: WordJumpGameProps) {
  const [play, setPlay] = useState<Play | null>(null);
  const [finished, setFinished] = useState<LevelState | null>(null);
  const { progress, storageAvailable } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const lang = pack.language.isoCode;
  const slug = pack.language.slug;
  const sound = progress.settings.sound;
  const voice = settingOn(progress.settings, "voice");
  const announce = settingOn(progress.settings, "announce");
  const speech = useMemo(() => ({ voice, announce }), [voice, announce]);
  const tts = useMemo(() => ttsOf(pack.language), [pack.language]);
  const toggleSpeech = useCallback(
    (setting: SpeechSetting) => saveSetting(setting, !speech[setting]),
    [speech],
  );
  // A preview never counts: it plays content that is not published.
  const seen = preview
    ? NO_PROGRESS
    : (progress.languages[slug] ?? NO_PROGRESS);

  const context: RoundContext | null = useMemo(
    () =>
      play
        ? { theme: play.theme, playable: pack.themes, rules: pack.language }
        : null,
    [play, pack.themes, pack.language],
  );

  const sourceTitles = useMemo(
    () => new Map(pack.sources.map((source) => [source.id, source.title])),
    [pack.sources],
  );

  // Only ever called from a click: the seed is taken when the player asks for
  // a level, never during render.
  const start = useCallback(
    (theme: Theme, only?: PackItem[]) => {
      const seed = Date.now();
      setFinished(null);
      setPlay({
        theme,
        items: only ?? buildRound(theme.items, seen, seed),
        seed,
      });
    },
    [seen],
  );

  const finish = useCallback(
    (level: LevelState) => {
      // Written once, when the level ends (spec §7.4), and never in a preview.
      if (!preview) saveRound(slug, levelOutcomes(level));
      setFinished(level);
    },
    [preview, slug],
  );

  const backToThemes = useCallback(() => {
    setPlay(null);
    setFinished(null);
  }, []);

  const previewNotice = preview ? (
    <p
      role="note"
      className="mt-6 rounded-[20px] border-2 border-dashed border-[#C7431C] bg-[#FFF7E8] px-5 py-4 text-[#241D14]"
    >
      <strong>Vista previa: puede tener errores.</strong> Incluye palabras sin
      verificar, marcadas como tales. No cuenta para el progreso y nadie más la
      ve.
    </p>
  ) : null;

  if (!play || !context) {
    return (
      <section aria-labelledby="temas" className="mt-8">
        {previewNotice}
        <h2 id="temas" className="mt-6 text-xl font-bold">
          Elige un tema
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {pack.themes.map((item) => {
            const known = item.items.filter(
              (each) => (seen[each.id]?.seen ?? 0) > 0,
            ).length;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => start(item)}
                  className={`${buttonClass} flex w-full items-center gap-3 bg-[#FBEFD2] text-left text-[#241D14] hover:bg-[#F6E3B4]`}
                >
                  <span aria-hidden="true" className="text-2xl">
                    {item.icon}
                  </span>
                  <span>
                    {item.name}
                    {item.nameNative ? (
                      <span lang={lang} className="block text-sm font-normal">
                        {item.nameNative}
                      </span>
                    ) : null}
                    <span className="block text-sm font-normal">
                      {MODE_NAMES[item.mode]} ·{" "}
                      {preview
                        ? `${item.items.length} palabras, ${
                            item.items.filter((each) => !each.verified).length
                          } sin verificar`
                        : `Palabras vistas: ${known} de ${item.items.length}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {storageAvailable || preview ? null : (
          // Said once, plainly: the game still works.
          <p className="mt-4 text-sm text-[#4A4130]">
            Tu navegador no nos deja guardar el progreso, así que no vamos a
            recordar tus partidas. El juego funciona igual.
          </p>
        )}
      </section>
    );
  }

  if (finished) {
    const outcomes = levelOutcomes(finished);
    const firstTry = outcomes.filter((outcome) => outcome.correctFirstTry);
    const toReview = missedItems(finished);

    return (
      <section aria-labelledby="meta" className="mt-8">
        <p aria-hidden="true" className="text-5xl">
          🏆
        </p>
        <h2 id="meta" className="mt-2 text-xl font-bold">
          ¡Llegaste a la meta!
        </h2>
        <p className="mt-3">
          Acertaste a la primera {firstTry.length} de {outcomes.length}.
        </p>
        <p className="mt-1">
          Puntos: <strong>{finished.score}</strong>{" "}
          <span aria-hidden="true">⭐</span>
        </p>
        {toReview.length > 0 ? (
          <>
            <h3 className="mt-6 font-bold">Palabras para repasar</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {toReview.map((item) => (
                <li key={item.id}>
                  <span lang={lang} className="font-bold">
                    {item.word}
                  </span>{" "}
                  — {item.translation}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          {toReview.length > 0 ? (
            <button
              type="button"
              onClick={() => start(play.theme, toReview)}
              className={`${buttonClass} bg-[#1B98A0] text-white hover:bg-[#157A80]`}
            >
              Repasar las falladas
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => start(play.theme)}
            className={`${buttonClass} bg-[#E4572E] text-white hover:bg-[#C7431C]`}
          >
            Otra partida
          </button>
          <button
            type="button"
            onClick={backToThemes}
            className={`${buttonClass} border-2 border-[#241D14] text-[#241D14]`}
          >
            Elegir otro tema
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      {previewNotice}
      <PlatformerGame
        key={play.seed}
        theme={play.theme}
        items={play.items}
        context={context}
        seed={play.seed}
        lang={lang}
        sourceTitles={sourceTitles}
        sound={sound}
        onToggleSound={() => saveSound(!sound)}
        tts={tts}
        speech={speech}
        onToggleSpeech={toggleSpeech}
        onFinish={finish}
        onExit={backToThemes}
      />
    </>
  );
}
