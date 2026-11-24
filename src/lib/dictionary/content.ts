import "server-only";

import {
  bundleToDictionary,
  type DictionaryContent,
} from "@/lib/language-bundles/adapters";
import { getLanguageBundle } from "@/lib/language-bundles/library";
import { type LanguageSlug, languages } from "@/lib/languages";

/**
 * The dictionary of `language` as the site shows it: verified entries of its
 * published bundle (or the repo's), sorted by the bundle's alphabet. Null when
 * the language has no verified entry yet (spec gestor-lenguas #7).
 */
export async function getDictionaryContent(
  language: string,
): Promise<DictionaryContent | null> {
  const result = await getLanguageBundle(language);
  if (result.status !== "ok") return null;

  const content = bundleToDictionary(result.bundle);
  return content.dictionary.entries.length > 0 ? content : null;
}

export type LanguageWithContent = {
  slug: LanguageSlug;
  name: string;
  total: number;
};

/** The languages that have a dictionary to show, with their entry counts. */
export async function getLanguagesWithContent(): Promise<
  LanguageWithContent[]
> {
  const found = await Promise.all(
    languages.map(async (language) => {
      const content = await getDictionaryContent(language.slug);
      return content
        ? [
            {
              slug: language.slug,
              name: language.name,
              total: content.dictionary.entries.length,
            },
          ]
        : [];
    }),
  );
  return found.flat();
}
