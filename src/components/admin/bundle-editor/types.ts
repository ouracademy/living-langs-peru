import type { LanguageBundle } from "@/lib/language-bundles/types";

/**
 * Every edit reports back with the new working copy and what to say. A null
 * bundle means nothing changed: the message explains why.
 */
export type EditorChange = (
  bundle: LanguageBundle | null,
  message: string,
) => void;
