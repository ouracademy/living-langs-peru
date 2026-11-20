"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import {
  EMPTY_PHOTO_FIELDS,
  photoFieldProblems,
  type PhotoFields,
  withCreditDefaults,
} from "@/lib/admin/photo-fields";

import { type SaveAnswer, sendToGallery } from "./admin-api";
import { ErrorSummary } from "./error-summary";
import {
  type FormProblems,
  focusProblems,
  listProblems,
} from "./form-problems";
import { GalleryCardPreview } from "./gallery-card-preview";
import {
  failureOf,
  type SaveFailure,
  SaveFailureNotice,
} from "./gallery-notice";
import { PhotoDropzone } from "./photo-dropzone";
import { fieldId, PhotoFieldInputs } from "./photo-field-inputs";
import { PhotoPreview } from "./photo-preview";
import { SaveProgress } from "./save-progress";
import { usePreparedPhoto } from "./use-prepared-photo";

type AddPhotoPanelProps = {
  id: string;
  /** The gallery version the list was read at; the save sends it back. */
  version: number;
  onSaved: (answer: SaveAnswer) => void;
  onClose: () => void;
  onReload: () => void;
};

const KEPT = {
  conflict: "Tu foto y tus datos no se perdieron:",
  offline: "Tus datos siguen en el formulario.",
};

const BUTTON =
  "min-h-11 w-full cursor-pointer rounded-full px-6 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C] sm:w-auto";

function withPhotoProblem(
  current: FormProblems,
  message: string | null,
): FormProblems {
  const next = { ...current };
  if (message) next.photo = message;
  else delete next.photo;
  return next;
}

/**
 * «Agregar foto», open above the list, not as a modal (UI-2): choose → see it
 * reduced → describe it → save. What the editor typed survives a conflict and
 * a reload of the list (UI-12): this state is not tied to the version.
 */
export function AddPhotoPanel({
  id,
  version,
  onSaved,
  onClose,
  onReload,
}: AddPhotoPanelProps) {
  const prefix = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [fields, setFields] = useState<PhotoFields>(EMPTY_PHOTO_FIELDS);
  const [problems, setProblems] = useState<FormProblems>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  // Set on a refused save; the effect moves the focus once it is rendered.
  const [focusRequest, setFocusRequest] = useState<FormProblems | null>(null);
  const { prepared, choose, clear } = usePreparedPhoto((message) =>
    setProblems((current) => withPhotoProblem(current, message)),
  );

  useEffect(() => titleRef.current?.focus(), []);
  useEffect(() => {
    if (focusRequest) {
      focusProblems(listProblems(prefix, focusRequest), summaryRef.current);
    }
  }, [focusRequest, prefix]);

  function refuse(found: FormProblems) {
    setProblems(found);
    setFocusRequest(found);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFailure(null);
    // The same rules the server applies, before anything leaves the browser.
    const found: FormProblems = photoFieldProblems(fields);
    if (prepared.kind === "preparing") {
      found.photo = "Espera a que la foto esté lista.";
    } else if (prepared.kind === "none") {
      // Keep «No pudimos leer la foto…» rather than a vaguer message.
      found.photo = problems.photo ?? "Elige una foto.";
    }
    if (Object.keys(found).length > 0 || prepared.kind !== "ready") {
      return refuse(found);
    }

    setSaving(true);
    const body = new FormData();
    for (const [name, value] of Object.entries(withCreditDefaults(fields))) {
      body.set(name, value);
    }
    body.set("version", String(version));
    body.set("photo", prepared.photo.blob, "foto.jpg");
    const { ok, answer } = await sendToGallery("POST", body);
    setSaving(false);

    if (ok) {
      onSaved(answer);
      return;
    }
    if (answer.fields) refuse(answer.fields);
    setFailure(
      failureOf({
        ...answer,
        message:
          answer.message ?? "No pudimos guardar la foto. Intenta de nuevo.",
      }),
    );
  }

  const listed = listProblems(prefix, problems);
  const ready = prepared.kind === "ready" ? prepared : null;

  return (
    <section
      id={id}
      aria-labelledby={`${prefix}-title`}
      className="mt-6 rounded-[20px] bg-white p-4 shadow-[0_2px_0_rgba(36,29,20,0.08)] sm:p-6"
    >
      <h2
        id={`${prefix}-title`}
        ref={titleRef}
        tabIndex={-1}
        className="text-2xl font-bold text-[#241D14] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
      >
        Agregar foto
      </h2>
      {/* noValidate: our messages, in Spanish, for every browser. */}
      <form noValidate onSubmit={submit} className="mt-4 flex flex-col gap-5">
        {listed.length >= 2 ? (
          <ErrorSummary ref={summaryRef} idPrefix={prefix} problems={listed} />
        ) : null}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            {ready ? (
              <PhotoPreview
                photo={ready.photo}
                previewUrl={ready.previewUrl}
                disabled={saving}
                onChange={clear}
              />
            ) : (
              <PhotoDropzone
                id={fieldId(prefix, "photo")}
                disabled={saving || prepared.kind === "preparing"}
                busy={prepared.kind === "preparing"}
                problem={problems.photo}
                onFile={choose}
              />
            )}
            {ready ? (
              <GalleryCardPreview
                previewUrl={ready.previewUrl}
                width={ready.photo.width}
                height={ready.photo.height}
                fields={fields}
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <PhotoFieldInputs
              idPrefix={prefix}
              fields={fields}
              problems={problems}
              disabled={saving}
              onChange={(name, value) =>
                setFields((current) => ({ ...current, [name]: value }))
              }
            />
          </div>
        </div>
        <div role="status">
          {saving ? <SaveProgress size={ready?.photo} /> : null}
        </div>
        {failure ? (
          <SaveFailureNotice
            failure={failure}
            kept={KEPT}
            onReload={onReload}
          />
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className={`${BUTTON} bg-[#E4572E] text-white hover:bg-[#C7431C] disabled:cursor-wait disabled:opacity-70`}
          >
            Guardar foto
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className={`${BUTTON} border-2 border-[#241D14] text-[#241D14] hover:bg-[#FBEFD2]`}
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
