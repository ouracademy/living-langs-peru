import { Fragment } from "react";

import { splitTerms } from "@/lib/peoples/terms";

type ParagraphTextProps = {
  text: string;
  terms?: string[];
};

/**
 * The words of a paragraph, with the Asháninka terms in `<i lang="cni">` so a
 * screen reader switches pronunciation and the reader sees them set apart,
 * the same way the dictionary sets its example sentences.
 */
export function ParagraphText({ text, terms }: ParagraphTextProps) {
  return splitTerms(text, terms).map((segment, index) =>
    segment.term ? (
      <i key={index} lang="cni">
        {segment.text}
      </i>
    ) : (
      <Fragment key={index}>{segment.text}</Fragment>
    ),
  );
}
