"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useSyncExternalStore } from "react";

import { WordJumpGame } from "@/components/word-jump/word-jump-game";
import {
  exportPackText,
  importPackText,
  packFileName,
  summarizePack,
} from "@/lib/language-packs/pack-file";
import type {
  PackEntry,
  VersionSummary,
} from "@/lib/language-packs/publishing";
import { validatePack } from "@/lib/language-packs/validate";
import { previewPack } from "@/lib/word-jump/game-state";

import {
  discardDraft,
  getDraft,
  getServerDraft,
  setDraft,
  subscribeDrafts,
} from "./draft-store";
import { formatPublishedAt } from "./format";
import { PackIssues } from "./pack-issues";
import { PackItems } from "./pack-items";
import { downloadText } from "./pack-api";
import { PublishForm } from "./publish-form";
import { dangerButton, panel, primaryButton, secondaryButton } from "./styles";
import { VersionHistory } from "./version-history";

type PackAdminProps = {
  language: string;
  name: string;
  /** Public URL of the audio bucket, for `validatePack`. */
  audioBaseUrl: string;
  current: PackEntry | null;
  versions: VersionSummary[];
};

type Notice = { tone: "ok" | "problem"; text: string; details?: string[] };

/**
 * /admin/juego for one language (spec §9.1): status, import, validation,
 * «Probar», export, publish and history. The pack in preparation lives only in
 * this browser (AC-SP6-13); every write goes through a Route Handler.
 */
export function PackAdmin({
  language,
  name,
  audioBaseUrl,
  current,
  versions,
}: PackAdminProps) {
  const router = useRouter();
  const fileId = useId();
  const draft = useSyncExternalStore(
    subscribeDrafts,
    () => getDraft(language),
    getServerDraft,
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const validation = useMemo(
    () => (draft ? validatePack(draft, { audioBaseUrl, language }) : null),
    [draft, audioBaseUrl, language],
  );
  const draftSummary = useMemo(
    () => (draft ? summarizePack(draft) : null),
    [draft],
  );
  const preview = useMemo(
    () => (draft && previewing ? previewPack(draft) : null),
    [draft, previewing],
  );
  const currentSummary = current ? summarizePack(current.pack) : null;

  function keep(pack: NonNullable<typeof draft>, done: string) {
    const saved = setDraft(language, pack);
    setNotice({
      tone: saved ? "ok" : "problem",
      text: saved
        ? done
        : `${done} No se pudo guardar una copia en este navegador: si cierras la pestaña, se pierde.`,
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const result = importPackText(await file.text());
    if (!result.ok) {
      // Nothing changes: the pack in preparation stays as it was (AC-SP6-4).
      setNotice({
        tone: "problem",
        text: "No se cargó el archivo: no tiene el formato de un paquete.",
        details: result.problems.slice(0, 10),
      });
      return;
    }
    if (result.pack.language.slug !== language) {
      setNotice({
        tone: "problem",
        text: `No se cargó el archivo: es un paquete de «${result.pack.language.slug}», no de ${name}.`,
      });
      return;
    }
    setPreviewing(false);
    keep(result.pack, `Paquete «${file.name}» cargado.`);
  }

  /** After publishing: the draft is now the published pack. */
  function published(message: string) {
    discardDraft(language);
    setPreviewing(false);
    setNotice({ tone: "ok", text: message });
    router.refresh();
  }

  /** After restoring: the draft, if any, is still the editor's work. */
  function restored(message: string) {
    setNotice({ tone: "ok", text: message });
    router.refresh();
  }

  return (
    <section
      aria-labelledby={`lengua-${language}`}
      className="mt-10 border-t-2 border-[#FBEFD2] pt-8"
    >
      <h2 id={`lengua-${language}`} className="text-2xl font-bold">
        {name}
      </h2>

      <div className={panel}>
        <h3 className="font-bold">Publicado</h3>
        {current && currentSummary ? (
          <p className="mt-1">
            Versión {current.version} · {formatPublishedAt(current.publishedAt)}
            {current.note ? ` · «${current.note}»` : ""}
            <span className="block text-sm text-[#4A4130]">
              {currentSummary.items} palabras en {currentSummary.themes} temas ·{" "}
              {currentSummary.unverified} sin verificar ·{" "}
              {currentSummary.withoutAudio} sin audio
            </span>
          </p>
        ) : (
          <p className="mt-1">Todavía no hay ningún paquete publicado.</p>
        )}
      </div>

      <div role="status" aria-live="polite">
        {notice ? (
          <div
            className={`mt-4 rounded-xl px-5 py-4 ${
              notice.tone === "ok"
                ? "bg-[#E6F4F1] text-[#1B4D4F]"
                : "border-2 border-[#C7431C] bg-white"
            }`}
          >
            <p className="font-bold">{notice.text}</p>
            {notice.details ? (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {notice.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <h3 className="mt-8 text-xl font-bold">Paquete en preparación</h3>
      <p className="mt-1 text-sm text-[#4A4130]">
        Vive solo en este navegador hasta que lo publiques.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor={fileId} className={secondaryButton}>
          Importar un .json
        </label>
        <input
          id={fileId}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {current && !draft ? (
          <button
            type="button"
            onClick={() =>
              keep(current.pack, "Copiamos el paquete publicado para editarlo.")
            }
            className={secondaryButton}
          >
            Partir del publicado
          </button>
        ) : null}
        {draft ? (
          <>
            <button
              type="button"
              onClick={() =>
                downloadText(packFileName(language), exportPackText(draft))
              }
              className={secondaryButton}
            >
              Exportar
            </button>
            <button
              type="button"
              aria-pressed={previewing}
              onClick={() => setPreviewing((value) => !value)}
              className={secondaryButton}
            >
              {previewing ? "Cerrar la prueba" : "Probar"}
            </button>
            {confirmDiscard ? (
              <>
                <span className="text-sm">
                  ¿Descartar el paquete en preparación?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    discardDraft(language);
                    setConfirmDiscard(false);
                    setPreviewing(false);
                    setNotice({
                      tone: "ok",
                      text: "Paquete en preparación descartado.",
                    });
                  }}
                  className={dangerButton}
                >
                  Sí, descartar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(false)}
                  className={secondaryButton}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDiscard(true)}
                className={dangerButton}
              >
                Descartar
              </button>
            )}
          </>
        ) : null}
      </div>

      {draft && validation && draftSummary ? (
        <>
          <p className="mt-4">
            <span lang={draft.language.isoCode}>{draft.language.title}</span>:{" "}
            {draftSummary.items} palabras en {draftSummary.themes} temas ·{" "}
            {draftSummary.unverified} sin verificar ·{" "}
            {draftSummary.withoutAudio} sin audio
          </p>
          <PackIssues validation={validation} />

          {previewing ? (
            <div className={panel}>
              <h4 className="font-bold">Prueba</h4>
              {preview ? (
                // A new import closes the preview, so a stale round never
                // survives a change of pack.
                <WordJumpGame pack={preview} preview />
              ) : (
                <p className="mt-2">
                  Ningún tema llega al mínimo de palabras para jugarse.
                </p>
              )}
            </div>
          ) : null}

          <h4 className="mt-8 text-lg font-bold">Publicar</h4>
          <PublishForm
            language={language}
            draft={draft}
            errorCount={validation.errors.length}
            unverifiedCount={draftSummary.unverified}
            expectedVersion={current?.version ?? 0}
            onPublished={published}
          />

          <h4 className="mt-8 text-lg font-bold">Palabras del paquete</h4>
          <PackItems pack={draft} />
        </>
      ) : (
        <p className="mt-4 text-[#4A4130]">
          Importa un archivo o parte del publicado para empezar.
        </p>
      )}

      <h3 className="mt-10 text-xl font-bold">Historial</h3>
      <VersionHistory
        language={language}
        versions={versions}
        currentVersion={current?.version ?? 0}
        onRestored={restored}
      />
      <p className="mt-6">
        <a
          href={`/juegos/saltapalabras/${language}`}
          className={`${primaryButton} no-underline`}
        >
          Ver la página del juego
        </a>
      </p>
    </section>
  );
}
