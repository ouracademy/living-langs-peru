import {
  adminError,
  adminJson,
  openBundleRequest,
  UNAVAILABLE_MESSAGE,
} from "@/lib/language-bundles/admin-route";
import { readCurrentBundle } from "@/lib/language-bundles/publishing";

type Context = { params: Promise<{ lengua: string }> };

/** The published bundle, with its version and note, or `current: null`. */
export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language } = await params;
  const opened = openBundleRequest(request, language);
  if (opened instanceof Response) return opened;

  const current = await readCurrentBundle(opened.client, opened.language);
  if (!current.ok) return adminError(502, "unavailable", UNAVAILABLE_MESSAGE);

  return adminJson({ current: current.value });
}
