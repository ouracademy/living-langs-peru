import { useId } from "react";

import {
  bundleFileName,
  bundleTemplate,
  exportBundleText,
} from "@/lib/language-bundles/bundle-file";
import type {
  BundleLanguage,
  LanguageBundle,
} from "@/lib/language-bundles/types";

import { downloadText } from "./download";
import { primaryButton, secondaryButton } from "./styles";

type CopyActionsProps = {
  language: BundleLanguage;
  hasDraft: boolean;
  current: { version: number; bundle: LanguageBundle } | null;
  onFile: (file: File | undefined) => void;
  onStart: (bundle: LanguageBundle, message: string) => void;
};

/**
 * How a working copy starts: from a file, from what is published, or from the
 * template (spec gestor-lenguas F2 and F3); and the downloads.
 */
export function CopyActions({
  language,
  hasDraft,
  current,
  onFile,
  onStart,
}: CopyActionsProps) {
  const fileId = useId();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <label htmlFor={fileId} className={primaryButton}>
        Subir JSON
      </label>
      <input
        id={fileId}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {current && !hasDraft ? (
        <button
          type="button"
          onClick={() =>
            onStart(
              current.bundle,
              "Copiamos el contenido publicado para trabajar.",
            )
          }
          className={secondaryButton}
        >
          Trabajar sobre lo publicado
        </button>
      ) : null}
      {hasDraft ? null : (
        <button
          type="button"
          onClick={() =>
            onStart(
              bundleTemplate(language),
              "Empezamos desde la plantilla: reemplaza todo lo que dice COMPLETAR o PRUEBA.",
            )
          }
          className={secondaryButton}
        >
          Empezar desde la plantilla
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          downloadText(
            bundleFileName(language, "plantilla"),
            exportBundleText(bundleTemplate(language)),
          )
        }
        className={secondaryButton}
      >
        Descargar plantilla
      </button>
      {current ? (
        <button
          type="button"
          onClick={() =>
            downloadText(
              bundleFileName(language, current.version),
              exportBundleText(current.bundle),
            )
          }
          className={secondaryButton}
        >
          Descargar lo publicado
        </button>
      ) : null}
    </div>
  );
}
