"use client";

import { Suspense, useMemo } from "react";

import { Dictionary } from "@/components/dictionary/dictionary";
import { WordJumpGame } from "@/components/word-jump/word-jump-game";
import {
  bundleToDictionary,
  bundleToPack,
} from "@/lib/language-bundles/adapters";
import type { LanguageBundle } from "@/lib/language-bundles/types";
import { previewPack } from "@/lib/word-jump/game-state";

import { panel } from "./styles";

type BundlePreviewProps = {
  bundle: LanguageBundle;
  name: string;
  isoCode: string;
};

/**
 * «Probar» (spec gestor-lenguas decision #12): the dictionary and Saltapalabras
 * as they would look with the working copy, verified words only, and the game
 * in preview mode, which never writes progress.
 */
export function BundlePreview({ bundle, name, isoCode }: BundlePreviewProps) {
  const content = useMemo(() => bundleToDictionary(bundle), [bundle]);
  const game = useMemo(
    () => previewPack(bundleToPack(bundle, { name, isoCode })),
    [bundle, name, isoCode],
  );

  return (
    <div className={panel}>
      <h3 className="text-lg font-bold">Prueba: diccionario</h3>
      {content.dictionary.entries.length > 0 ? (
        <Suspense fallback={<p className="mt-2">Cargando…</p>}>
          <Dictionary
            entries={content.dictionary.entries}
            language={bundle.language}
            languageName={name}
            languageCode={isoCode}
            availableLanguages={[bundle.language]}
            sources={content.sources}
            alphabet={content.alphabet}
          />
        </Suspense>
      ) : (
        <p className="mt-2">
          Ninguna palabra está verificada: el diccionario se vería vacío.
        </p>
      )}

      <h3 className="mt-8 text-lg font-bold">Prueba: Saltapalabras</h3>
      {game ? (
        <WordJumpGame pack={game} preview />
      ) : (
        <p className="mt-2">
          Ningún tema llega al mínimo de palabras para jugarse.
        </p>
      )}
    </div>
  );
}
