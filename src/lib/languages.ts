export const languages = [
  { slug: "ashaninka", name: "Asháninka" },
  { slug: "uro", name: "Uro" },
] as const;

export type LanguageSlug = (typeof languages)[number]["slug"];

export function getLanguage(slug: string) {
  return languages.find((language) => language.slug === slug);
}
