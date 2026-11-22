import { revalidateTag } from "next/cache";

import {
  adminError,
  adminJson,
  openBundleRequest,
  readJsonBody,
  UNAVAILABLE_MESSAGE,
} from "@/lib/language-bundles/admin-route";
import { bundleTag } from "@/lib/language-bundles/library";
import {
  publishBundle,
  readBundleVersion,
} from "@/lib/language-bundles/publishing";
import {
  readRestoreRequest,
  restoreNote,
} from "@/lib/language-packs/publish-request";

type Context = { params: Promise<{ lengua: string }> };

/**
 * «Restaurar»: publishes an old version as a new one, so the history is never
 * rewritten. Same invalidation as publishing.
 */
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language } = await params;
  const opened = openBundleRequest(request, language);
  if (opened instanceof Response) return opened;

  const read = readRestoreRequest(await readJsonBody(request));
  if (!read.ok) return adminError(400, read.error, read.message);

  const entry = await readBundleVersion(
    opened.client,
    opened.language,
    read.version,
  );
  if (!entry.ok) return adminError(502, "unavailable", UNAVAILABLE_MESSAGE);
  if (!entry.value) {
    return adminError(404, "version_not_found", "Esa versión no existe.");
  }

  const published = await publishBundle(opened.client, {
    language: opened.language,
    bundle: entry.value.bundle,
    expectedVersion: read.expectedVersion,
    note: restoreNote(read.version),
  });
  if (!published.ok) {
    return published.error === "version_conflict"
      ? adminError(
          409,
          "version_conflict",
          "Alguien publicó otra versión mientras tanto. Recarga la página y vuelve a intentar.",
        )
      : adminError(502, published.error, UNAVAILABLE_MESSAGE);
  }

  revalidateTag(bundleTag(opened.language), "max");

  return adminJson({
    ok: true,
    version: published.version,
    message: `La versión ${read.version} quedó publicada como versión ${published.version}.`,
  });
}
