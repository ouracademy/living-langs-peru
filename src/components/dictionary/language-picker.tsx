"use client";

import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { languages } from "@/lib/languages";

type LanguagePickerProps = {
  /** Slug of the language being shown. */
  current: string;
  currentName: string;
  currentTotal: number;
  /** Slugs that actually have a dictionary; the rest render as disabled. */
  available: string[];
  onLanguageChange: (slug: string) => void;
};

export function LanguagePicker({
  current,
  currentName,
  currentTotal,
  available,
  onLanguageChange,
}: LanguagePickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Lengua: ${currentName}`}
        className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-[#FBEFD2]"
      >
        {currentName}
        <span className="font-normal text-[#4A4130]">
          {currentTotal} palabras
        </span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {languages.map((language) => {
          const hasDictionary = available.includes(language.slug);

          return (
            <DropdownMenuItem
              key={language.slug}
              // Languages without a dictionary stay visible but disabled:
              // hiding them would hide the project's scope.
              disabled={!hasDictionary}
              onClick={
                hasDictionary
                  ? () => onLanguageChange(language.slug)
                  : undefined
              }
            >
              {language.name}
              {!hasDictionary && (
                <span className="text-[#4A4130] italic">pronto</span>
              )}
              {language.slug === current && (
                <span className="sr-only">(actual)</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
