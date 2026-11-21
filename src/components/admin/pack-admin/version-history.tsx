"use client";

import { useState } from "react";

import { exportPackText, packFileName } from "@/lib/language-packs/pack-file";
import type { VersionSummary } from "@/lib/language-packs/publishing";

import { formatPublishedAt } from "./format";
import { downloadText, fetchVersion, restoreVersion } from "./pack-api";
import { primaryButton, secondaryButton } from "./styles";

type VersionHistoryProps = {
  language: string;
  versions: VersionSummary[];
  /** The version on the public page; 0 when none. */
  currentVersion: number;
  onRestored: (message: string) => void;
};

/**
 * The history, newest first, with «Descargar» and «Restaurar» (spec §9.1).
 * Restoring publishes the old version as a new one (AC-SP6-9), after an
 * inline confirmation.
 */
export function VersionHistory({
  language,
  versions,
  currentVersion,
  onRestored,
}: VersionHistoryProps) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (versions.length === 0) {
    return <p className="mt-3 text-[#4A4130]">Todavía no hay versiones.</p>;
  }

  async function download(version: number) {
    setProblem(null);
    const { ok, answer } = await fetchVersion(language, version);
    if (!ok || !answer.pack) {
      setProblem(answer.message ?? "No pudimos descargar esa versión.");
      return;
    }
    downloadText(packFileName(language, version), exportPackText(answer.pack));
  }

  async function restore(version: number) {
    setBusy(true);
    setProblem(null);
    const { ok, answer } = await restoreVersion(
      language,
      version,
      currentVersion,
    );
    setBusy(false);
    setConfirming(null);
    if (ok) onRestored(answer.message ?? `Versión ${version} restaurada.`);
    else setProblem(answer.message ?? "No pudimos restaurar esa versión.");
  }

  return (
    <>
      {problem ? (
        <p role="alert" className="mt-3 font-bold text-[#C7431C]">
          {problem}
        </p>
      ) : null}
      <ol className="mt-3 flex flex-col gap-3">
        {versions.map((entry) => (
          <li key={entry.version} className="rounded-xl bg-white px-5 py-4">
            <p className="font-bold">
              Versión {entry.version}
              {entry.version === currentVersion ? " (publicada)" : ""}
            </p>
            <p className="text-sm text-[#4A4130]">
              {formatPublishedAt(entry.publishedAt)}
              {entry.note ? ` · ${entry.note}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void download(entry.version)}
                aria-label={`Descargar la versión ${entry.version}`}
                className={secondaryButton}
              >
                Descargar
              </button>
              {entry.version === currentVersion ? null : confirming ===
                entry.version ? (
                <>
                  <span className="self-center text-sm">
                    ¿Publicar la versión {entry.version} como una versión nueva?
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void restore(entry.version)}
                    className={primaryButton}
                  >
                    {busy ? "Restaurando…" : "Sí, restaurar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className={secondaryButton}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(entry.version)}
                  aria-label={`Restaurar la versión ${entry.version}`}
                  className={secondaryButton}
                >
                  Restaurar
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
