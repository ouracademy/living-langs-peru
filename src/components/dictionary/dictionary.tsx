"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { type Entry, resolveWord, searchEntries } from "@/lib/dictionary";

import { EntryDetail } from "./entry-detail";
import { EntryList } from "./entry-list";
import { LanguagePicker } from "./language-picker";
import { SearchBox } from "./search-box";
import { useDebounced } from "./use-debounced";

/** The query param is Spanish because it is part of the public, shareable URL. */
const WORD_PARAM = "palabra";

type DictionaryProps = {
  entries: Entry[];
  language: string;
  languageName: string;
  languageCode: string;
  availableLanguages: string[];
};

export function Dictionary({
  entries,
  language,
  languageName,
  languageCode,
  availableLanguages,
}: DictionaryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The query lives in local state, not the URL: only ?palabra is shareable.
  // Dictionary owns it so the input and the filter cannot drift apart.
  const [input, setInput] = useState("");
  const query = useDebounced(input, 150);
  const visible = useMemo(
    () => searchEntries(entries, query),
    [entries, query],
  );

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

  function changeLanguage(slug: string) {
    // An entry id means nothing in another language, so ?palabra is dropped
    // and the search box resets.
    setInput("");

    if (slug === language) {
      window.history.replaceState(null, "", pathname);
      return;
    }

    router.push(`/diccionario/${slug}`);
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div>
        <div className="mb-4">
          <LanguagePicker
            current={language}
            currentName={languageName}
            currentTotal={entries.length}
            available={availableLanguages}
            onLanguageChange={changeLanguage}
          />
        </div>

        <SearchBox
          value={input}
          resultCount={visible.length}
          onChange={setInput}
        />

        {missing && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-[#E4572E] bg-white px-4 py-3 text-sm"
          >
            No encontramos esa palabra en el diccionario. Puede que el enlace
            esté mal escrito o que aún no hayamos añadido la palabra.
          </p>
        )}

        <div className="mt-4" />
        <EntryList
          entries={visible}
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
