"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import {
  photoFieldProblems,
  type PhotoFieldProblems,
  type PhotoFields,
} from "@/lib/admin/photo-fields";
import type { Photo } from "@/lib/peoples";

import { ErrorSummary } from "./error-summary";
import { focusProblems, listProblems } from "./form-problems";
import { PhotoFieldInputs } from "./photo-field-inputs";

type EditPhotoFormProps = {
  photo: Photo;
  disabled: boolean;
  /** Resolves with the server's field problems (empty when saved). */
  onSave: (fields: PhotoFields) => Promise<PhotoFieldProblems>;
  onCancel: () => void;
};

function fieldsOf(photo: Photo): PhotoFields {
  return {
    alt: photo.alt,
    caption: photo.caption ?? "",
    author: photo.credit.author,
    license: photo.credit.license,
    url: photo.credit.url ?? "",
  };
}

const sameFields = (a: PhotoFields, b: PhotoFields) =>
  (Object.keys(a) as (keyof PhotoFields)[]).every(
    (name) => a[name].trim() === b[name].trim(),
  );

/**
 * Edit a photo's texts in its own row, not in a dialog: the editor keeps the
 * photo in view. «Guardar cambios» waits for a change, and Escape cancels
 * (UI-14).
 */
export function EditPhotoForm({
  photo,
  disabled,
  onSave,
  onCancel,
}: EditPhotoFormProps) {
  const prefix = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [initial] = useState(() => fieldsOf(photo));
  const [fields, setFields] = useState<PhotoFields>(initial);
  const [problems, setProblems] = useState<PhotoFieldProblems>({});
  const [focusRequest, setFocusRequest] = useState<PhotoFieldProblems | null>(
    null,
  );
  const unchanged = sameFields(fields, initial);

  useEffect(() => {
    if (focusRequest) {
      focusProblems(listProblems(prefix, focusRequest), summaryRef.current);
    }
  }, [focusRequest, prefix]);

  function refuse(found: PhotoFieldProblems) {
    setProblems(found);
    setFocusRequest(found);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unchanged) return;
    const found = photoFieldProblems(fields);
    if (Object.keys(found).length > 0) return refuse(found);
    const fromServer = await onSave(fields);
    if (Object.keys(fromServer).length > 0) refuse(fromServer);
  }

  const listed = listProblems(prefix, problems);

  return (
    <form
      noValidate
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !disabled) {
          event.preventDefault();
          onCancel();
        }
      }}
      aria-label="Editar los datos de la foto"
      className="flex flex-col gap-4 rounded-xl bg-[#FFF7E8] p-4"
    >
      {listed.length >= 2 ? (
        <ErrorSummary ref={summaryRef} idPrefix={prefix} problems={listed} />
      ) : null}
      <PhotoFieldInputs
        idPrefix={prefix}
        fields={fields}
        problems={problems}
        disabled={disabled}
        onChange={(name, value) =>
          setFields((current) => ({ ...current, [name]: value }))
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={disabled || unchanged}
          className="min-h-11 cursor-pointer rounded-full bg-[#E4572E] px-5 text-sm font-bold text-white hover:bg-[#C7431C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {unchanged ? "Sin cambios" : "Guardar cambios"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="min-h-11 cursor-pointer rounded-full border-2 border-[#241D14] px-5 text-sm font-bold text-[#241D14] hover:bg-[#FBEFD2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
