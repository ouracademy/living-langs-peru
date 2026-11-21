import {
  adminError,
  adminJson,
  openAdminRequest,
  UNAVAILABLE_MESSAGE,
} from "@/lib/language-packs/admin-route";
import { listVersions } from "@/lib/language-packs/publishing";

type Context = { params: Promise<{ lengua: string }> };

/** The history, newest first: version, date and note (AC-SP6-9). */
export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language } = await params;
  const opened = openAdminRequest(request, language);
  if (opened instanceof Response) return opened;

  const versions = await listVersions(opened.client, opened.language);
  if (!versions.ok) return adminError(502, "unavailable", UNAVAILABLE_MESSAGE);

  return adminJson({ versions: versions.value });
}
