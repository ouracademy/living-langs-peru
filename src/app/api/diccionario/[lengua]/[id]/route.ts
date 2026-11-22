import { apiError } from "@/lib/dictionary/api";
import { resolveWord } from "@/lib/dictionary";
import { getDictionaryContent } from "@/lib/dictionary/content";

type Context = { params: Promise<{ lengua: string; id: string }> };

// No request data is read: prerendered, and regenerated with the bundle.
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language, id } = await params;
  const content = await getDictionaryContent(language);

  if (!content) {
    return apiError(
      "language_not_found",
      `No hay diccionario para «${language}».`,
    );
  }

  const entry = resolveWord(content.dictionary.entries, id);

  if (!entry) {
    return apiError("entry_not_found", `No existe la entrada «${id}».`);
  }

  return Response.json({ language, entry });
}
