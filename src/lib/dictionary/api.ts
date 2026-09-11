/** Error codes the dictionary API can return. Keys and codes are English. */
export type ApiErrorCode =
  "language_not_found" | "entry_not_found" | "invalid_parameter";

const STATUS: Record<ApiErrorCode, number> = {
  language_not_found: 404,
  entry_not_found: 404,
  invalid_parameter: 400,
};

/** The message text stays in Spanish: people read it. */
export function apiError(error: ApiErrorCode, message: string): Response {
  return Response.json({ error, message }, { status: STATUS[error] });
}

export const MAX_LIMIT = 500;

type Paging = { limit: number; offset: number };

/**
 * Reads limit/offset, rejecting anything out of range rather than silently
 * clamping: a caller asking for 1000 should learn the cap exists.
 */
export function readPaging(
  params: URLSearchParams,
  total: number,
): Paging | { problem: string } {
  const rawLimit = params.get("limit");
  const rawOffset = params.get("offset");

  const limit = rawLimit === null ? total : Number(rawLimit);
  const offset = rawOffset === null ? 0 : Number(rawOffset);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return {
      problem: `«limit» debe ser un entero entre 1 y ${MAX_LIMIT}.`,
    };
  }

  if (!Number.isInteger(offset) || offset < 0) {
    return { problem: "«offset» debe ser un entero mayor o igual a 0." };
  }

  return { limit, offset };
}
