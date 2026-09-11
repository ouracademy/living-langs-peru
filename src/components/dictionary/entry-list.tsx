"use client";

import { type Entry, groupByLetter } from "@/lib/dictionary";

type EntryListProps = {
  entries: Entry[];
  selectedId?: string;
  languageCode: string;
  onSelect: (entry: Entry) => void;
};

const sectionId = (letter: string) => `letra-${letter.toLowerCase()}`;

export function EntryList({
  entries,
  selectedId,
  languageCode,
  onSelect,
}: EntryListProps) {
  const groups = groupByLetter(entries);

  return (
    <>
      <nav aria-label="Índice alfabético" className="mb-4 flex flex-wrap gap-1">
        {groups.map((group) => (
          <a
            key={group.letter}
            href={`#${sectionId(group.letter)}`}
            aria-label={`Ir a la letra ${group.letter}`}
            className="rounded-full px-2.5 py-1 text-sm font-bold hover:bg-[#F2B705]"
          >
            {group.letter}
          </a>
        ))}
      </nav>

      {/* A region rather than an outer list: nesting one <ul> per letter inside
          list items made the flat listitem count meaningless. */}
      <section aria-label="Palabras" className="flex flex-col">
        {groups.map((group) => (
          <section
            key={group.letter}
            id={sectionId(group.letter)}
            // role=group so each section is addressable by its letter.
            role="group"
            aria-label={group.letter}
            className="scroll-mt-4"
          >
            <h2 className="sticky top-0 bg-[#FFF7E8] px-3 py-1 text-sm font-bold text-[#6A3E8C]">
              {group.letter}
            </h2>
            <ul className="flex flex-col">
              {group.entries.map((entry) => {
                const isSelected = entry.id === selectedId;

                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(entry)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`w-full border-b border-gray-200 px-3 py-2 text-left hover:bg-[#FBEFD2] ${
                        isSelected ? "bg-[#FBEFD2]" : ""
                      }`}
                    >
                      <span className="font-bold" lang={languageCode}>
                        {entry.word}
                      </span>
                      <span className="text-[#4A4130]">
                        {" — "}
                        {entry.translations.join("; ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </section>
    </>
  );
}
