import Image from "next/image";

import { PhotoCaption } from "@/components/peoples/photo-credit";
import { creditFrom, type PhotoFields } from "@/lib/admin/photo-fields";
import { isHttpsUrl } from "@/lib/peoples/validate";

type GalleryCardPreviewProps = {
  previewUrl: string;
  width: number;
  height: number;
  fields: PhotoFields;
};

/**
 * «Así se verá» (UI-7): the caption and credit with the very component the
 * public gallery uses, updated as the editor types. A URL that is not valid yet
 * is left out, as it would be refused on save.
 */
export function GalleryCardPreview({
  previewUrl,
  width,
  height,
  fields,
}: GalleryCardPreviewProps) {
  const credit = creditFrom({
    ...fields,
    url: isHttpsUrl(fields.url.trim()) ? fields.url : "",
  });
  const caption = fields.caption.trim();

  return (
    <section
      aria-label="Así se verá en la galería"
      className="rounded-xl bg-[#FFF7E8] p-3"
    >
      <p className="mb-2 font-bold text-[#241D14]">Así se verá en la galería</p>
      <figure>
        <Image
          src={previewUrl}
          unoptimized
          width={width}
          height={height}
          alt=""
          className="h-auto w-full rounded-[20px] bg-[#FBEFD2]"
        />
        <figcaption className="mt-3 text-sm text-[#4A4130]">
          <PhotoCaption caption={caption || undefined} credit={credit} />
        </figcaption>
      </figure>
    </section>
  );
}
