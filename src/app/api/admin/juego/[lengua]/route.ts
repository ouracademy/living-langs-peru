import {
  adminError,
  adminJson,
  openAdminRequest,
  UNAVAILABLE_MESSAGE,
} from "@/lib/language-packs/admin-route";
import { readCurrentPack } from "@/lib/language-packs/publishing";

type Context = { params: Promise<{ lengua: string }> };

/** The published pack, with its version and note, or `current: null`. */
export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language } = await params;
  const opened = openAdminRequest(request, language);
  if (opened instanceof Response) return opened;

  const current = await readCurrentPack(opened.client, opened.language);
  if (!current.ok) return adminError(502, "unavailable", UNAVAILABLE_MESSAGE);

  return adminJson({ current: current.value });
}
