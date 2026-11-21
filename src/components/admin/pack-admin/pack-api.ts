import type { LanguagePack } from "@/lib/language-packs/types";
import type { Issue } from "@/lib/language-packs/validate";

/** What every /api/admin/juego answer can carry. */
export type PackAnswer = {
  ok?: boolean;
  version?: number;
  message?: string;
  error?: string;
  issues?: Issue[];
  problems?: string[];
  pack?: LanguagePack;
  current?: { version: number; pack: LanguagePack } | null;
};

/** Same origin: the browser resends the Basic Auth credentials itself. */
async function call(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; answer: PackAnswer }> {
  try {
    const response = await fetch(url, { cache: "no-store", ...init });
    const answer: PackAnswer = await response.json().catch(() => ({}));
    return { ok: response.ok, answer };
  } catch {
    return {
      ok: false,
      answer: {
        error: "offline",
        message: "No hay conexión. Revisa tu internet y vuelve a intentar.",
      },
    };
  }
}

const base = (language: string) =>
  `/api/admin/juego/${encodeURIComponent(language)}`;

function postJson(url: string, body: unknown) {
  return call(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function publishDraft(
  language: string,
  pack: LanguagePack,
  expectedVersion: number | null,
  note: string,
) {
  return postJson(`${base(language)}/publicar`, {
    pack,
    expectedVersion,
    note,
  });
}

export function restoreVersion(
  language: string,
  version: number,
  expectedVersion: number | null,
) {
  return postJson(`${base(language)}/restaurar`, { version, expectedVersion });
}

export function fetchCurrent(language: string) {
  return call(base(language));
}

export function fetchVersion(language: string, version: number) {
  return call(`${base(language)}/versiones/${version}`);
}

/** Saves `text` as a file through the browser's own download. */
export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
