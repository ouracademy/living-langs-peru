"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { type Entry, resolveWord } from "@/lib/dictionary";

import { EntryDetail } from "./entry-detail";
import { EntryList } from "./entry-list";

/** The query param is Spanish because it is part of the public, shareable URL. */
const WORD_PARAM = "palabra";

type DictionaryProps = {
  entries: Entry[];
  languageCode: string;
};

export function Dictionary({ entries, languageCode }: DictionaryProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get(WORD_PARAM);
  const selected = requested ? resolveWord(entries, requested) : undefined;
  const missing = Boolean(requested) && !selected;

  // The native History API rather than router.push/replace: this is a
  // query-only change on a prerendered route, which is what Next documents the
  // History API for. It syncs with useSearchParams, keeps the scroll position,
  // and avoids refetching a server component whose output cannot change.
  // router.replace(pathname) is also a no-op here, leaving ?palabra stuck.
  function select(entry: Entry) {
    // push, not replace: the back button should walk back through words.
    window.history.pushState(null, "", `${pathname}?${WORD_PARAM}=${entry.id}`);
  }

  function clear() {
    window.history.replaceState(null, "", pathname);
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div>
        {missing && (
          <p
            role="alert"
            className="mb-4 rounded-2xl border border-[#E4572E] bg-white px-4 py-3 text-sm"
          >
            No encontramos esa palabra en el diccionario. Puede que el enlace
            esté mal escrito o que aún no hayamos añadido la palabra.
          </p>
        )}

        <EntryList
          entries={entries}
          selectedId={selected?.id}
          languageCode={languageCode}
          onSelect={select}
        />
      </div>

      {selected && (
        <EntryDetail
          entry={selected}
          languageCode={languageCode}
          onClose={clear}
        />
      )}
    </div>
  );
}
