import { LockKeyhole } from "lucide-react";
import Image from "next/image";

import { describePhotoSize } from "@/lib/admin/license-suggestions";

import type { ResizedPhoto } from "./resize-image";

type PhotoPreviewProps = {
  photo: ResizedPhoto;
  previewUrl: string;
  disabled: boolean;
  onChange: () => void;
};

/**
 * The photo exactly as it will be saved (UI-4): already reduced, with its
 * final size and weight, and the reminder that its location data is gone.
 */
export function PhotoPreview({
  photo,
  previewUrl,
  disabled,
  onChange,
}: PhotoPreviewProps) {
  return (
    <div className="flex flex-col gap-2">
      <Image
        // A blob: URL made in this browser; there is nothing to optimise.
        src={previewUrl}
        unoptimized
        width={photo.width}
        height={photo.height}
        alt=""
        className="h-auto w-full rounded-xl bg-[#FBEFD2]"
      />
      <p className="text-sm text-[#4A4130]">
        Se guardará así:{" "}
        <strong className="text-[#241D14]">
          {describePhotoSize(photo.width, photo.height, photo.blob.size)} · JPEG
        </strong>
      </p>
      <p className="flex items-center gap-2 text-sm text-[#4A4130]">
        <LockKeyhole aria-hidden className="size-4 shrink-0" />
        Se quitan los datos de ubicación (GPS) de la foto.
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onChange}
        className="min-h-11 cursor-pointer self-start rounded-full border-2 border-[#241D14] px-5 text-sm font-bold text-[#241D14] hover:bg-[#FBEFD2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cambiar foto
      </button>
    </div>
  );
}
