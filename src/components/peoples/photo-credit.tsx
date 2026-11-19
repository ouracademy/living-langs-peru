import type { PhotoCredit } from "@/lib/peoples";

type PhotoCaptionProps = {
  caption?: string;
  credit: PhotoCredit;
};

/**
 * What goes under a gallery photo: the caption, then «Autor · Licencia». The
 * license links to the file's home page when there is one; a photo without a
 * source page (since 2026-11-18, e.g. one taken by the team) shows it as plain
 * text, never as a link to nowhere.
 *
 * Shared by the public gallery and the «Así se verá» preview in /admin/fotos,
 * so the editor sees exactly what the reader will.
 */
export function PhotoCaption({ caption, credit }: PhotoCaptionProps) {
  return (
    <>
      {caption ? <span className="block text-[#241D14]">{caption}</span> : null}
      <span className="mt-1 block">
        {credit.author} ·{" "}
        {credit.url ? (
          <a
            href={credit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#C7431C] underline underline-offset-2 hover:no-underline"
          >
            {credit.license}
          </a>
        ) : (
          <span className="font-bold">{credit.license}</span>
        )}
      </span>
    </>
  );
}
