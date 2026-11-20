"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useState } from "react";

import { PhotoCaption } from "@/components/peoples/photo-credit";
import type { Photo } from "@/lib/peoples";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]";

/**
 * The photo as stored: in the bucket, or in `public/` for the original ones.
 * Saving publishes (spec #15), so there is no «publishing» copy since UI-10
 * was simplified; a file that does not load says so instead of a broken image.
 */
export function Thumbnail({ photo }: { photo: Photo }) {
  const [missing, setMissing] = useState(false);
  const box = "h-[120px] w-[160px] shrink-0 rounded-xl bg-[#FBEFD2]";

  if (missing) {
    return (
      <div
        className={`${box} flex items-center justify-center px-3 text-center text-xs text-[#4A4130]`}
      >
        No pudimos cargar la foto
      </div>
    );
  }

  return (
    <Image
      src={photo.src}
      width={photo.width}
      height={photo.height}
      alt=""
      sizes="160px"
      onError={() => setMissing(true)}
      className={`${box} object-cover`}
    />
  );
}

export function PhotoDetails({ photo }: { photo: Photo }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm text-[#4A4130]">
      <span className="line-clamp-2 text-[#241D14]">{photo.alt}</span>
      <PhotoCaption caption={photo.caption} credit={photo.credit} />
    </div>
  );
}

/** Up and down, one place at a time, with the position in their name. */
export function ReorderButtons({
  position,
  total,
  disabled,
  onMove,
}: {
  position: number;
  total: number;
  disabled: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  const arrow = `inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-2 border-[#241D14] bg-white text-[#241D14] hover:bg-[#FBEFD2] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;
  return (
    <>
      <button
        type="button"
        data-photo-action="up"
        aria-label={`Subir la foto ${position}`}
        disabled={disabled || position === 1}
        onClick={() => onMove("up")}
        className={arrow}
      >
        <ArrowUp aria-hidden className="size-5" />
      </button>
      <button
        type="button"
        data-photo-action="down"
        aria-label={`Bajar la foto ${position}`}
        disabled={disabled || position === total}
        onClick={() => onMove("down")}
        className={arrow}
      >
        <ArrowDown aria-hidden className="size-5" />
      </button>
    </>
  );
}

export function RowButton({
  action,
  label,
  disabled,
  expanded,
  danger,
  onClick,
  children,
}: {
  action: string;
  label: string;
  disabled: boolean;
  expanded?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-photo-action={action}
      aria-label={label}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
      className={
        danger
          ? `inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full px-3 text-sm font-bold text-[#C7431C] hover:bg-[#FBEFD2] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`
          : `min-h-11 cursor-pointer rounded-full border-2 border-[#241D14] px-4 text-sm font-bold text-[#241D14] hover:bg-[#FBEFD2] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`
      }
    >
      {children}
    </button>
  );
}

export function RemoveIcon() {
  return <Trash2 aria-hidden className="size-4" />;
}

/** Asked in the row; the safe choice has the focus when it opens. */
export function RemoveConfirmation({
  position,
  disabled,
  onConfirm,
  onCancel,
}: {
  position: number;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#FBEFD2] p-3 text-sm text-[#241D14]">
      <span>
        ¿Quitar la foto {position} de la galería? Si la subió el equipo, también
        se borra el archivo. No se puede deshacer.
      </span>
      <button
        type="button"
        ref={(element) => element?.focus()}
        disabled={disabled}
        onClick={onCancel}
        className={`min-h-11 cursor-pointer rounded-full border-2 border-[#241D14] px-4 font-bold ${FOCUS}`}
      >
        Cancelar
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onConfirm}
        className={`min-h-11 cursor-pointer rounded-full bg-[#C7431C] px-4 font-bold text-white disabled:cursor-wait disabled:opacity-70 ${FOCUS}`}
      >
        Sí, quitar
      </button>
    </div>
  );
}
