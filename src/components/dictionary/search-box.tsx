"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 150;

type SearchBoxProps = {
  /** Number of entries currently shown, announced to screen readers. */
  resultCount: number;
  onQueryChange: (query: string) => void;
};

export function SearchBox({ resultCount, onQueryChange }: SearchBoxProps) {
  const inputId = useId();
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => onQueryChange(value), DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [value, onQueryChange]);

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-bold">
        Buscar una palabra
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <Input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="En la lengua o en español"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="rounded-full p-2 hover:bg-[#FBEFD2]"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Limpiar búsqueda</span>
          </button>
        )}
      </div>

      <p
        role="status"
        aria-live="polite"
        aria-label="Resultados"
        className="mt-2 text-sm text-[#4A4130]"
      >
        {resultCount === 0
          ? "Sin resultados"
          : `${resultCount} ${resultCount === 1 ? "palabra" : "palabras"}`}
      </p>
    </div>
  );
}
