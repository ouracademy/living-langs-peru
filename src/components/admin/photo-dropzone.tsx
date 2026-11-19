import { CircleAlert, ImagePlus } from "lucide-react";
import { type DragEvent, useState } from "react";

import { ACCEPTED_INPUT_TYPES } from "./resize-image";

type PhotoDropzoneProps = {
  id: string;
  disabled: boolean;
  busy: boolean;
  problem?: string;
  onFile: (file: File) => void;
};

/**
 * Drop a photo here or choose one (UI-3). The zone is the `<label>` of a real
 * file input, kept in the tab order but visually hidden: Enter or Space opens
 * the picker with no script, a screen reader announces it as what it is, and
 * on a phone it offers the camera or the gallery.
 */
export function PhotoDropzone({
  id,
  disabled,
  busy,
  problem,
  onFile,
}: PhotoDropzoneProps) {
  const [over, setOver] = useState(false);
  const errorId = `${id}-error`;

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        data-over={over || undefined}
        className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#C9B48A] bg-[#FBEFD2] p-5 text-center text-[#241D14] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#C7431C] data-[over]:border-[#C7431C] data-[over]:bg-[#F6E3B4]"
      >
        <ImagePlus aria-hidden className="size-8" />
        <span>
          <span className="font-bold text-[#C7431C] underline underline-offset-2">
            Elige una foto
          </span>{" "}
          o arrástrala aquí
        </span>
        <span className="text-sm text-[#4A4130]">
          {busy
            ? "Preparando la foto…"
            : "JPEG, PNG o WebP. Se achica sola antes de enviarse."}
        </span>
        <input
          id={id}
          name="photo"
          type="file"
          accept={ACCEPTED_INPUT_TYPES.join(",")}
          required
          disabled={disabled}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? errorId : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            // Choosing the same file again after an error must fire again.
            event.target.value = "";
          }}
          className="sr-only"
        />
      </label>
      {problem ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1 text-sm font-bold text-[#C7431C]"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {problem}
        </p>
      ) : null}
    </div>
  );
}
