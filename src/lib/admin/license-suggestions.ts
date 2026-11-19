import { DEFAULT_CREDIT } from "./photo-fields";

/**
 * The licenses the editor picks most often, offered as one-tap buttons
 * (docs/edicion-fotos-ui.md, UI-6). The field still takes any other text.
 */
export const LICENSE_SUGGESTIONS = [
  "CC BY-SA 4.0",
  "CC BY 4.0",
  "Dominio público",
  DEFAULT_CREDIT.license,
] as const;

/**
 * «2400 × 1800 px · 1,2 MB» for the preview. The decimal comma is written by
 * hand, not through `Intl.NumberFormat`, for the reason `formatCount` gives in
 * src/lib/peoples/format.ts: the separator depends on the ICU build.
 */
export function describePhotoSize(
  width: number,
  height: number,
  bytes: number,
): string {
  const megabytes = (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");
  return `${width} × ${height} px · ${megabytes} MB`;
}
