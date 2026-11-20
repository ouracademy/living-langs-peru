import type { PhotoFieldProblems } from "@/lib/admin/photo-fields";
import type { Photo } from "@/lib/peoples";

/** What every save answers (see src/app/api/admin/fotos/route.ts). */
export type SaveAnswer = {
  ok?: boolean;
  /** The gallery's version after the save; the next save sends it back. */
  version?: number;
  photos?: Photo[];
  /** The photo as saved, on «add». */
  photo?: Photo;
  message?: string;
  error?: string;
  fields?: PhotoFieldProblems;
};

/** Same origin: the browser resends the Basic Auth credentials itself. */
export async function sendToGallery(
  method: "POST" | "PATCH" | "DELETE",
  body: FormData | Record<string, string | number>,
): Promise<{ ok: boolean; answer: SaveAnswer }> {
  try {
    const response = await fetch("/api/admin/fotos", {
      method,
      ...(body instanceof FormData
        ? { body }
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
    const answer: SaveAnswer = await response.json().catch(() => ({}));
    return { ok: response.ok, answer };
  } catch {
    return { ok: false, answer: { error: "offline" } };
  }
}

export const isConflict = (answer: SaveAnswer) =>
  answer.error === "version_conflict";

export const isOffline = (answer: SaveAnswer) => answer.error === "offline";
