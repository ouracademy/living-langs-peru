import type {
  PhotoFieldName,
  PhotoFieldProblems,
} from "@/lib/admin/photo-fields";

import type { SummaryProblem } from "./error-summary";
import { FIELD_LABELS, FIELD_NAMES, fieldId } from "./photo-field-inputs";

/** Field problems plus the photo itself, which only «Agregar» has. */
export type FormProblems = PhotoFieldProblems & { photo?: string };

export const PHOTO_LABEL = "Foto";

const ORDER: (PhotoFieldName | "photo")[] = ["photo", ...FIELD_NAMES];

/** The problems in reading order, with the id of the control to focus. */
export function listProblems(
  idPrefix: string,
  problems: FormProblems,
): SummaryProblem[] {
  return ORDER.filter((name) => problems[name]).map((name) => ({
    id: fieldId(idPrefix, name),
    label: name === "photo" ? PHOTO_LABEL : FIELD_LABELS[name],
    message: problems[name] ?? "",
  }));
}

/**
 * Where the focus goes after a refused save: the summary when two or more
 * fields are wrong (UI-13), otherwise straight to the one field.
 */
export function focusProblems(
  listed: SummaryProblem[],
  summary: HTMLElement | null,
) {
  if (listed.length >= 2) {
    summary?.focus();
    return;
  }
  if (listed.length === 1) document.getElementById(listed[0].id)?.focus();
}
