"use client";

import Image from "next/image";
import { useState } from "react";

import type { Photo } from "@/lib/peoples";

type PhotoEditorProps = {
  photos: Photo[];
};

/**
 * Read-only for now (F1). A photo saved but not yet deployed is not in this
 * deployment's `public/`, so its thumbnail fails to load: that case shows
 * «Pendiente de publicar» instead of a broken image (plan §3.9).
 */
export function PhotoEditor({ photos }: PhotoEditorProps) {
  if (photos.length === 0) {
    return (
      <p className="mt-8 text-[#4A4130]">La galería no tiene fotos todavía.</p>
    );
  }

  return (
    <ol className="mt-8 flex flex-col gap-6">
      {photos.map((photo, index) => (
        <li
          key={photo.src}
          className="flex flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[0_2px_0_rgba(36,29,20,0.08)] sm:flex-row"
        >
          <Thumbnail photo={photo} />
          <div className="flex flex-col gap-1 text-sm text-[#4A4130]">
            <span className="font-bold text-[#241D14]">Foto {index + 1}</span>
            <span>
              <span className="font-bold">Descripción:</span> {photo.alt}
            </span>
            {photo.caption ? (
              <span>
                <span className="font-bold">Pie de foto:</span> {photo.caption}
              </span>
            ) : null}
            <span>
              <span className="font-bold">Crédito:</span> {photo.credit.author}{" "}
              ·{" "}
              <a
                href={photo.credit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#C7431C] underline underline-offset-2 hover:no-underline"
              >
                {photo.credit.license}
              </a>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Thumbnail({ photo }: { photo: Photo }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div className="flex h-[120px] w-[160px] shrink-0 items-center justify-center rounded-xl bg-[#FBEFD2] px-3 text-center text-xs text-[#4A4130]">
        Pendiente de publicar
      </div>
    );
  }

  return (
    <Image
      src={photo.src}
      width={photo.width}
      height={photo.height}
      // The description is right next to it as text.
      alt=""
      sizes="160px"
      onError={() => setMissing(true)}
      className="h-[120px] w-[160px] shrink-0 rounded-xl bg-[#FBEFD2] object-cover"
    />
  );
}
