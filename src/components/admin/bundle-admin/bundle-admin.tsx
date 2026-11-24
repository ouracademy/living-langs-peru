"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import {
  type BundleDiff,
  bundleFileName,
  diffBundles,
  exportBundleText,
  importBundleText,
  isEmptyDiff,
  summarizeBundle,
} from "@/lib/language-bundles/bundle-file";
import {
  type EntryFilter,
  NO_FILTER,
} from "@/lib/language-bundles/edit-bundle";
import {
  type EditorTab,
  issueTarget,
} from "@/lib/language-bundles/editor-view";
import type {
  BundleLanguage,
  LanguageBundle,
} from "@/lib/language-bundles/types";
import {
  type BundleIssue,
  validateBundle,
} from "@/lib/language-bundles/validate";

import { BundleEditor } from "../bundle-editor/bundle-editor";
import { ENTRY_PAGE } from "../bundle-editor/entries-panel";
import { downloadText } from "./download";
import { dangerButton, secondaryButton } from "./styles";
import { BundleHistory, type HistoryVersion } from "./bundle-history";
import { BundleIssues } from "./bundle-issues";
import {
  DraftSummary,
  type Notice,
  NoticeBox,
  PublishedPanel,
} from "./bundle-parts";
import { BundlePreview } from "./bundle-preview";
import { BundlePublishForm } from "./bundle-publish-form";
import { CopyActions } from "./copy-actions";
import {
  discardBundleDraft,
  getBundleDraft,
  getServerBundleDraft,
  setBundleDraft,
  subscribeBundleDrafts,
} from "./draft-store";
import { UploadConfirm } from "./upload-confirm";

export type PublishedBundle = HistoryVersion & { bundle: LanguageBundle };

type BundleAdminProps = {
  language: BundleLanguage;
  name: string;
  /** ISO 639-3 for previews; empty when not confirmed. */
  isoCode: string;
  /** Public URL of the audio bucket, for `validateBundle`. */
  audioBaseUrl?: string;
  current: PublishedBundle | null;
  versions: HistoryVersion[];
};

type PendingUpload = {
  fileName: string;
  bundle: LanguageBundle;
  diff: BundleDiff;
};

/** Reads an uploaded file into a bundle of this language, or a problem notice. */
async function readUpload(
  file: File,
  language: BundleLanguage,
  name: string,
): Promise<{ bundle: LanguageBundle } | { notice: Notice }> {
  const result = importBundleText(await file.text());
  if (!result.ok) {
    return {
      notice: {
        tone: "problem",
        text: "No se cargó el archivo: no tiene el formato de un paquete de lengua.",
        details: result.problems.slice(0, 10),
      },
    };
  }
  if (result.bundle.language !== language) {
    return {
      notice: {
        tone: "problem",
        text: `No se cargó el archivo: es de «${result.bundle.language}», no de ${name}.`,
      },
    };
  }
  return { bundle: result.bundle };
}

/**
 * /admin/lenguas/[lengua] (spec gestor-lenguas §5, F2): upload a JSON, check
 * it, try it, publish it, and the history. The working copy lives only in
 * this browser; every write goes through a Route Handler.
 */
export function BundleAdmin({
  language,
  name,
  isoCode,
  audioBaseUrl,
  current,
  versions,
}: BundleAdminProps) {
  const router = useRouter();
  const draft = useSyncExternalStore(
    subscribeBundleDrafts,
    () => getBundleDraft(language),
    getServerBundleDraft,
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [tab, setTab] = useState<EditorTab>("palabras");
  const [filter, setFilter] = useState<EntryFilter>(NO_FILTER);
  const [limit, setLimit] = useState(ENTRY_PAGE);

  const validation = useMemo(
    () =>
      draft
        ? validateBundle(draft, {
            language,
            ...(audioBaseUrl ? { audioBaseUrl } : {}),
          })
        : null,
    [draft, language, audioBaseUrl],
  );
  const draftSummary = useMemo(
    () => (draft ? summarizeBundle(draft) : null),
    [draft],
  );
  const currentSummary = useMemo(
    () => (current ? summarizeBundle(current.bundle) : null),
    [current],
  );

  function keep(bundle: LanguageBundle, done: string) {
    const saved = setBundleDraft(language, bundle);
    setPreviewing(false);
    setNotice({
      tone: saved ? "ok" : "problem",
      text: saved
        ? done
        : `${done} No se pudo guardar una copia en este navegador: si cierras la pestaña, se pierde.`,
    });
  }

  /** An edit from the editor: the preview stays open, the message is announced. */
  function edit(bundle: LanguageBundle | null, message: string) {
    if (!bundle) {
      setNotice({ tone: "problem", text: message });
      return;
    }
    const saved = setBundleDraft(language, bundle);
    setNotice({
      tone: saved ? "ok" : "problem",
      text: saved
        ? message
        : `${message} No se pudo guardar una copia en este navegador: si cierras la pestaña, se pierde.`,
    });
  }

  /** From the list of problems to where each one is fixed. */
  function goTo(issue: BundleIssue) {
    const target = issueTarget(issue);
    if (!target) return;
    flushSync(() => {
      setTab(target.tab);
      if (target.tab === "palabras") {
        // The row has to be in the list to receive the focus.
        setFilter(NO_FILTER);
        setLimit(Number.MAX_SAFE_INTEGER);
      }
    });
    const element = document.getElementById(target.anchor);
    element?.scrollIntoView?.({ block: "center" });
    element?.focus();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const read = await readUpload(file, language, name);
    if ("notice" in read) {
      // Nothing changes: the working copy stays as it was.
      setNotice(read.notice);
      return;
    }
    const base = draft ?? current?.bundle ?? null;
    const diff = base ? diffBundles(base, read.bundle) : null;
    if (diff && !isEmptyDiff(diff)) {
      setPending({ fileName: file.name, bundle: read.bundle, diff });
      return;
    }
    keep(read.bundle, `Archivo «${file.name}» cargado.`);
  }

  function refreshAfter(message: string, clearDraft: boolean) {
    if (clearDraft) discardBundleDraft(language);
    setPreviewing(false);
    setNotice({ tone: "ok", text: message });
    router.refresh();
  }

  return (
    <>
      <PublishedPanel current={current} summary={currentSummary} />
      <NoticeBox notice={notice} />

      <h2 className="mt-8 text-xl font-bold">Copia de trabajo</h2>
      <p className="mt-1 text-sm text-[#4A4130]">
        Vive solo en este navegador hasta que la publiques.
      </p>
      <CopyActions
        language={language}
        hasDraft={Boolean(draft)}
        current={current}
        onFile={(file) => void onFile(file)}
        onStart={keep}
      />

      {pending ? (
        <UploadConfirm
          fileName={pending.fileName}
          diff={pending.diff}
          onConfirm={() => {
            keep(pending.bundle, `Archivo «${pending.fileName}» cargado.`);
            setPending(null);
          }}
          onCancel={() => {
            setPending(null);
            setNotice({
              tone: "ok",
              text: "No se cargó el archivo: la copia de trabajo sigue igual.",
            });
          }}
        />
      ) : null}

      {draft && validation && draftSummary ? (
        <>
          <DraftSummary summary={draftSummary} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                downloadText(bundleFileName(language), exportBundleText(draft))
              }
              className={secondaryButton}
            >
              Descargar la copia
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
                <span className="text-sm">¿Descartar la copia de trabajo?</span>
                <button
                  type="button"
                  onClick={() => {
                    discardBundleDraft(language);
                    setConfirmDiscard(false);
                    setPreviewing(false);
                    setNotice({
                      tone: "ok",
                      text: "Copia de trabajo descartada.",
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
          </div>

          <BundleIssues validation={validation} onGo={goTo} />

          {previewing ? (
            <BundlePreview bundle={draft} name={name} isoCode={isoCode} />
          ) : null}

          <BundleEditor
            bundle={draft}
            lang={isoCode}
            validation={validation}
            tab={tab}
            onTab={setTab}
            filter={filter}
            onFilter={setFilter}
            limit={limit}
            onLimit={setLimit}
            onChange={edit}
          />

          <h2 className="mt-8 text-xl font-bold">Publicar</h2>
          <BundlePublishForm
            language={language}
            draft={draft}
            errorCount={validation.errors.length}
            unverifiedCount={draftSummary.entries - draftSummary.verified}
            expectedVersion={current?.version ?? 0}
            onPublished={(message) => refreshAfter(message, true)}
          />
        </>
      ) : (
        <p className="mt-4 text-[#4A4130]">
          Sube un archivo JSON o trabaja sobre lo publicado para empezar.
        </p>
      )}

      <h2 className="mt-10 text-xl font-bold">Historial</h2>
      <BundleHistory
        language={language}
        versions={versions}
        currentVersion={current?.version ?? 0}
        onRestored={(message) => refreshAfter(message, false)}
      />
      <p className="mt-6 flex flex-wrap gap-3">
        <a
          href={`/diccionario/${language}`}
          className={`${secondaryButton} no-underline`}
        >
          Ver el diccionario
        </a>
        <a
          href={`/juegos/saltapalabras/${language}`}
          className={`${secondaryButton} no-underline`}
        >
          Ver Saltapalabras
        </a>
      </p>
    </>
  );
}
