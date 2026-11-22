import type { LanguageBundle } from "@/lib/language-bundles/types";
import type { BundleIssue } from "@/lib/language-bundles/validate";

/** What every /api/admin/lenguas answer can carry. */
export type BundleAnswer = {
  ok?: boolean;
  version?: number;
  message?: string;
  error?: string;
  issues?: BundleIssue[];
  problems?: string[];
  bundle?: LanguageBundle;
  current?: { version: number; bundle: LanguageBundle } | null;
};

/** Same origin: the browser resends the Basic Auth credentials itself. */
async function call(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; answer: BundleAnswer }> {
  try {
    const response = await fetch(url, { cache: "no-store", ...init });
    const answer: BundleAnswer = await response.json().catch(() => ({}));
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
  `/api/admin/lenguas/${encodeURIComponent(language)}`;

function postJson(url: string, body: unknown) {
  return call(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function publishBundleDraft(
  language: string,
  bundle: LanguageBundle,
  expectedVersion: number | null,
  note: string,
) {
  return postJson(`${base(language)}/publicar`, {
    bundle,
    expectedVersion,
    note,
  });
}

export function restoreBundleVersion(
  language: string,
  version: number,
  expectedVersion: number | null,
) {
  return postJson(`${base(language)}/restaurar`, { version, expectedVersion });
}

export function fetchCurrentBundle(language: string) {
  return call(base(language));
}

export function fetchBundleVersion(language: string, version: number) {
  return call(`${base(language)}/versiones/${version}`);
}
