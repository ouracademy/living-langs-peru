import { type Source, sourceImprint } from "@/lib/dictionary/types";

/**
 * «Título, Editorial, Año.» with the title linked only when the source has a
 * URL: sources from a language bundle may lack publisher, year or URL.
 */
export function SourceCitation({ source }: { source: Source }) {
  return (
    <>
      {source.url ? (
        <a href={source.url} className="underline" rel="noreferrer noopener">
          {source.title}
        </a>
      ) : (
        source.title
      )}
      {sourceImprint(source)}
    </>
  );
}
