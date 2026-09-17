import { Fragment } from "react";

type CitationProps = {
  /** Anchor the matching footnote links back to. Build it with `citationId`. */
  anchor: string;
  numbers: number[];
};

/**
 * The superscript mark after a claim. Numbers come from `buildFootnotes`, so
 * they are never written into the content by hand.
 */
export function Citation({ anchor, numbers }: CitationProps) {
  if (numbers.length === 0) return null;

  return (
    <sup id={anchor} className="ml-0.5 scroll-mt-24 text-[0.7em] font-bold">
      {numbers.map((number, index) => (
        <Fragment key={number}>
          {index > 0 ? <span aria-hidden="true">,</span> : null}
          <a
            href={`#nota-${number}`}
            // A screen reader announcing a bare "1" tells the listener nothing.
            aria-label={`Ver la fuente ${number}`}
            className="text-[#C7431C] underline underline-offset-2 hover:no-underline"
          >
            {number}
          </a>
        </Fragment>
      ))}
    </sup>
  );
}
