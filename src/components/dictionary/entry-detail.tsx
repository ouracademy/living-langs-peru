"use client";

import { Check, Copy, X } from "lucide-react";
import { useState } from "react";

import type { Entry } from "@/lib/dictionary";

const PART_OF_SPEECH_LABELS: Record<string, string> = {
  noun: "sustantivo",
  verb: "verbo",
  adjective: "adjetivo",
  adverb: "adverbio",
  pronoun: "pronombre",
  interjection: "interjección",
  phrase: "expresión",
};

type EntryDetailProps = {
  entry: Entry;
  /** ISO 639-3 code, so screen readers do not read examples as Spanish. */
  languageCode: string;
  onClose: () => void;
};

export function EntryDetail({
  entry,
  languageCode,
  onClose,
}: EntryDetailProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      aria-label={`Detalle de ${entry.word}`}
      className="rounded-[22px] border border-gray-300 bg-white p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" lang={languageCode}>
            {entry.word}
          </h2>
          {entry.partOfSpeech && (
            <p className="text-sm text-[#4A4130] italic">
              {PART_OF_SPEECH_LABELS[entry.partOfSpeech]}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-[#FBEFD2]"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar detalle</span>
        </button>
      </div>

      <ul aria-label="Traducciones" className="mt-4 flex flex-col gap-1">
        {entry.translations.map((translation) => (
          <li key={translation}>{translation}</li>
        ))}
      </ul>

      {entry.variants && entry.variants.length > 0 && (
        <p className="mt-3 text-sm text-[#4A4130]">
          También se escribe: {entry.variants.join(", ")}
        </p>
      )}

      {entry.notes && (
        <p className="mt-3 text-sm text-[#4A4130]">{entry.notes}</p>
      )}

      <h3 className="mt-6 text-sm font-bold">Ejemplos de uso</h3>
      {entry.examples.length > 0 ? (
        <ul aria-label="Ejemplos de uso" className="mt-2 flex flex-col gap-3">
          {entry.examples.map((example) => (
            <li
              key={example.sentence}
              className="border-l-2 border-[#F2B705] pl-3"
            >
              <p lang={languageCode} className="font-medium">
                {example.sentence}
              </p>
              <p className="text-sm text-[#4A4130]">{example.translation}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#4A4130]">
          Aún no tenemos ejemplos de uso para esta palabra.
        </p>
      )}

      <button
        type="button"
        onClick={copyLink}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-[#FBEFD2]"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Enlace copiado" : "Copiar enlace"}
      </button>
    </section>
  );
}
