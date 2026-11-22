"use client";

import { useId, useState } from "react";

import {
  bundleFileName,
  exportBundleText,
  MAX_NOTE_LENGTH,
} from "@/lib/language-bundles/bundle-file";
import type { LanguageBundle } from "@/lib/language-bundles/types";

import { downloadText } from "../pack-admin/pack-api";
import { primaryButton, secondaryButton } from "../pack-admin/styles";
import { fetchCurrentBundle, publishBundleDraft } from "./bundle-api";

type BundlePublishFormProps = {
  language: string;
  draft: LanguageBundle;
  /** Errors found in the browser: publishing waits for them. */
  errorCount: number;
  unverifiedCount: number;
  /** The version the editor sees; 0 when none is published yet. */
  expectedVersion: number;
  onPublished: (message: string) => void;
};

/**
 * Publishing with a mandatory note and the version the editor saw. A conflict
 * offers «Descargar la publicada» and «Publicar igual».
 */
export function BundlePublishForm({
  language,
  draft,
  errorCount,
  unverifiedCount,
  expectedVersion,
  onPublished,
}: BundlePublishFormProps) {
  const noteId = useId();
  const hintId = useId();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  async function publish(expected: number | null) {
    setBusy(true);
    setProblem(null);
    const { ok, answer } = await publishBundleDraft(
      language,
      draft,
      expected,
      note,
    );
    setBusy(false);

    if (ok) {
      setConflict(false);
      setNote("");
      onPublished(answer.message ?? "Contenido publicado.");
      return;
    }
    setConflict(answer.error === "version_conflict");
    setProblem(answer.message ?? "No pudimos publicar. Vuelve a intentar.");
  }

  async function downloadPublished() {
    const { ok, answer } = await fetchCurrentBundle(language);
    if (!ok || !answer.current) {
      setProblem(
        answer.message ?? "No pudimos descargar la versión publicada.",
      );
      return;
    }
    downloadText(
      bundleFileName(language, answer.current.version),
      exportBundleText(answer.current.bundle),
    );
  }

  const blocked = errorCount > 0 || note.trim() === "" || busy;

  return (
    <form
      className="mt-4 flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!blocked) void publish(expectedVersion);
      }}
    >
      <label htmlFor={noteId} className="font-bold">
        Nota de publicación (obligatoria)
      </label>
      <p id={hintId} className="text-sm text-[#4A4130]">
        Quién revisó el contenido y qué cambia. Queda en el historial.
        {unverifiedCount > 0
          ? ` Ojo: ${unverifiedCount} ${
              unverifiedCount === 1
                ? "palabra sin verificar no se mostrará"
                : "palabras sin verificar no se mostrarán"
            }.`
          : ""}
      </p>
      <textarea
        id={noteId}
        aria-describedby={hintId}
        value={note}
        maxLength={MAX_NOTE_LENGTH}
        required
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        className="rounded-xl border-2 border-[#4A4130] bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-[#241D14]"
      />
      <div>
        <button type="submit" disabled={blocked} className={primaryButton}>
          {busy ? "Publicando…" : "Publicar"}
        </button>
        {errorCount > 0 ? (
          <span className="ml-3 text-sm text-[#C7431C]">
            Corrige los errores para poder publicar.
          </span>
        ) : null}
      </div>

      {problem ? (
        <div
          role="alert"
          className="rounded-xl border-2 border-[#C7431C] bg-white px-5 py-4"
        >
          <p>{problem}</p>
          {conflict ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void downloadPublished()}
                className={secondaryButton}
              >
                Descargar la publicada
              </button>
              <button
                type="button"
                disabled={busy || note.trim() === ""}
                onClick={() => void publish(null)}
                className={primaryButton}
              >
                Publicar igual
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
