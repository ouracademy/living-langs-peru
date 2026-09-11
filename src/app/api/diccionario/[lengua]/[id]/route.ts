import { apiError } from "@/lib/dictionary/api";
import { getDictionary, resolveWord } from "@/lib/dictionary";

type Context = { params: Promise<{ lengua: string; id: string }> };

export const dynamic = "force-static";

export async function GET(
  _request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language, id } = await params;
  const dictionary = getDictionary(language);

  if (!dictionary) {
    return apiError(
      "language_not_found",
      `No hay diccionario para «${language}».`,
    );
  }

  const entry = resolveWord(dictionary.entries, id);

  if (!entry) {
    return apiError("entry_not_found", `No existe la entrada «${id}».`);
  }

  return Response.json({ language, entry });
}
