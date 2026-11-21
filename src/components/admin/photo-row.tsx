"use client";

import type { Ref } from "react";

import type { PhotoFieldProblems, PhotoFields } from "@/lib/admin/photo-fields";
import type { Photo } from "@/lib/peoples";

import { EditPhotoForm } from "./edit-photo-form";
import {
  PhotoDetails,
  RemoveConfirmation,
  RemoveIcon,
  ReorderButtons,
  RowButton,
  Thumbnail,
} from "./photo-row-parts";

export type RowMode = "view" | "editing" | "confirming";

type PhotoRowProps = {
  photo: Photo;
  position: number;
  total: number;
  pending: boolean;
  mode: RowMode;
  ref?: Ref<HTMLLIElement>;
  onMove: (direction: "up" | "down") => void;
  onModeChange: (mode: RowMode) => void;
  onSave: (fields: PhotoFields) => Promise<PhotoFieldProblems>;
  onRemove: () => void;
  /** Called when a form or question closes without saving. */
  onDismiss: (action: "edit" | "remove") => void;
};

/**
 * One photo of the list (UI-11): its position, the photo, its texts, then the
 * arrows, «Editar», and «Quitar» apart and in red so it is not hit by mistake.
 */
export function PhotoRow({
  photo,
  position,
  total,
  pending,
  mode,
  ref,
  onMove,
  onModeChange,
  onSave,
  onRemove,
  onDismiss,
}: PhotoRowProps) {
  return (
    <li
      ref={ref}
      className="flex flex-col gap-3 rounded-[20px] bg-white p-3 shadow-[0_2px_0_rgba(36,29,20,0.08)] sm:p-4"
    >
      <div className="flex gap-3 sm:gap-4">
        <span
          aria-hidden
          className="w-6 shrink-0 text-center text-2xl font-bold text-[#4A4130] sm:w-8"
        >
          {position}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-4">
          <Thumbnail photo={photo} />
          <PhotoDetails photo={photo} />
        </div>
      </div>
      <div
        role="group"
        aria-label={`Acciones de la foto ${position}`}
        className="flex flex-wrap items-center gap-2"
      >
        <ReorderButtons
          position={position}
          total={total}
          disabled={pending}
          onMove={onMove}
        />
        <RowButton
          action="edit"
          label={`Editar los datos de la foto ${position}`}
          disabled={pending}
          expanded={mode === "editing"}
          onClick={() => onModeChange(mode === "editing" ? "view" : "editing")}
        >
          Editar
        </RowButton>
        <span className="flex-1" />
        <RowButton
          action="remove"
          label={`Quitar la foto ${position}`}
          disabled={pending}
          expanded={mode === "confirming"}
          danger
          onClick={() => onModeChange("confirming")}
        >
          <RemoveIcon />
          Quitar
        </RowButton>
      </div>
      {mode === "confirming" ? (
        <RemoveConfirmation
          position={position}
          disabled={pending}
          onConfirm={onRemove}
          onCancel={() => onDismiss("remove")}
        />
      ) : null}
      {mode === "editing" ? (
        <EditPhotoForm
          photo={photo}
          disabled={pending}
          onCancel={() => onDismiss("edit")}
          onSave={onSave}
        />
      ) : null}
    </li>
  );
}
