import {
  adminError,
  adminJson,
  openAdminRequest,
  UNAVAILABLE_MESSAGE,
} from "@/lib/language-packs/admin-route";
import { readVersion } from "@/lib/language-packs/publishing";

type Context = { params: Promise<{ lengua: string; version: string }> };

/** One version of the history, pack included: «Descargar» in the history. */
export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language, version: rawVersion } = await params;
  const opened = openAdminRequest(request, language);
  if (opened instanceof Response) return opened;

  const version = Number(rawVersion);
  if (!Number.isInteger(version) || version < 1) {
    return adminError(400, "invalid_request", "Esa versión no es válida.");
  }

  const entry = await readVersion(opened.client, opened.language, version);
  if (!entry.ok) return adminError(502, "unavailable", UNAVAILABLE_MESSAGE);
  if (!entry.value) {
    return adminError(404, "version_not_found", "Esa versión no existe.");
  }

  return adminJson(entry.value);
}
