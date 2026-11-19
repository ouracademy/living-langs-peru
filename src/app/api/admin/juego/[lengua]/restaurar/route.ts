import { revalidateTag } from "next/cache";

import {
  adminError,
  adminJson,
  openAdminRequest,
  readJsonBody,
  UNAVAILABLE_MESSAGE,
} from "@/lib/language-packs/admin-route";
import { packTag } from "@/lib/language-packs/library";
import {
  readRestoreRequest,
  restoreNote,
} from "@/lib/language-packs/publish-request";
import { publishPack, readVersion } from "@/lib/language-packs/publishing";

type Context = { params: Promise<{ lengua: string }> };

/**
 * «Restaurar»: publishes an old version as a new one, so the history is never
 * rewritten (spec §6.2, AC-SP6-9). Same invalidation as publishing.
 */
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language } = await params;
  const opened = openAdminRequest(request, language);
  if (opened instanceof Response) return opened;

  const read = readRestoreRequest(await readJsonBody(request));
  if (!read.ok) return adminError(400, read.error, read.message);

  const entry = await readVersion(opened.client, opened.language, read.version);
  if (!entry.ok) return adminError(502, "unavailable", UNAVAILABLE_MESSAGE);
  if (!entry.value) {
    return adminError(404, "version_not_found", "Esa versión no existe.");
  }

  const published = await publishPack(opened.client, {
    language: opened.language,
    pack: entry.value.pack,
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

  revalidateTag(packTag(opened.language), "max");

  return adminJson({
    ok: true,
    version: published.version,
    message: `La versión ${read.version} quedó publicada como versión ${published.version}.`,
  });
}
