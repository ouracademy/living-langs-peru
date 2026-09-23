import Image from "next/image";

import type { Photo } from "@/lib/peoples";

type PhotoGalleryProps = {
  photos: Photo[];
};

/**
 * Credit is rendered under each photo, not hidden in a `title`: attribution
 * only counts if a reader can see it. Every file here was checked one by one
 * on Wikimedia Commons — see `docs/ashaninka-sources.md`.
 *
 * No lightbox: it would add client JavaScript to a page that needs none.
 */
export function PhotoGallery({ photos }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <section
      id="galeria"
      aria-labelledby="galeria-title"
      className="scroll-mt-24 bg-white"
    >
      <div className="mx-auto max-w-[1180px] px-8 py-16">
        <h2 id="galeria-title" className="text-3xl font-bold text-[#241D14]">
          Galería
        </h2>
        <ul className="mt-8 grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.src}>
              <figure>
                <Image
                  src={photo.src}
                  // `width` and `height` are the file's real dimensions, so
                  // the browser reserves the right box before it loads.
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="h-auto w-full rounded-[20px] bg-[#FBEFD2]"
                />
                <figcaption className="mt-3 text-sm text-[#4A4130]">
                  {photo.caption ? (
                    <span className="block text-[#241D14]">
                      {photo.caption}
                    </span>
                  ) : null}
                  <span className="mt-1 block">
                    {photo.credit.author} ·{" "}
                    <a
                      href={photo.credit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#C7431C] underline underline-offset-2 hover:no-underline"
                    >
                      {photo.credit.license}
                    </a>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
