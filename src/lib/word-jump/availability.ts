/**
 * Languages that will never have a pack, and why, written in code so the page
 * says it without asking the database (plan §3.3, AC-SP4-9). Keyed by slug
 * from src/lib/languages.ts.
 */
export const LANGUAGES_WITHOUT_PACK: Record<string, string> = {
  uro: "El uro no tiene hablantes desde la década de 1920 ni alfabeto oficial, así que no hay de dónde sacar palabras verificadas ni grabaciones. No ponemos fecha: depende de un trabajo de recuperación lingüística que recién podría empezar.",
};

export function hasNoPack(language: string): boolean {
  return Object.hasOwn(LANGUAGES_WITHOUT_PACK, language);
}
