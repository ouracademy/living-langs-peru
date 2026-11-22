import {
  adminError,
  adminJson,
  openBundleRequest,
  UNAVAILABLE_MESSAGE,
} from "@/lib/language-bundles/admin-route";
import { listBundleVersions } from "@/lib/language-bundles/publishing";

type Context = { params: Promise<{ lengua: string }> };

/** The history, newest first: version, date and note. */
export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language } = await params;
  const opened = openBundleRequest(request, language);
  if (opened instanceof Response) return opened;

  const versions = await listBundleVersions(opened.client, opened.language);
  if (!versions.ok) return adminError(502, "unavailable", UNAVAILABLE_MESSAGE);

  return adminJson({ versions: versions.value });
}
