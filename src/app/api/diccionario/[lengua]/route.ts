import { apiError, readPaging } from "@/lib/dictionary/api";
import { searchEntries } from "@/lib/dictionary";
import { getDictionaryContent } from "@/lib/dictionary/content";

type Context = { params: Promise<{ lengua: string }> };

/**
 * Reads ?q from the request, so this route stays dynamic. That is correct
 * here and should not be forced static. The bundle itself is cached.
 */
export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language } = await params;
  const content = await getDictionaryContent(language);

  if (!content) {
    return apiError(
      "language_not_found",
      `No hay diccionario para «${language}».`,
    );
  }

  const url = new URL(request.url);
  const matches = searchEntries(
    content.dictionary.entries,
    url.searchParams.get("q") ?? "",
    content.alphabet,
  );
  const paging = readPaging(url.searchParams, matches.length);

  if ("problem" in paging) {
    return apiError("invalid_parameter", paging.problem);
  }

  return Response.json({
    language,
    // Total matches, before paging.
    total: matches.length,
    offset: paging.offset,
    limit: paging.limit,
    entries: matches.slice(paging.offset, paging.offset + paging.limit),
  });
}
