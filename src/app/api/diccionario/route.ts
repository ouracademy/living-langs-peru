import { getLanguagesWithDictionary } from "@/lib/dictionary";

// No request data is read, so this can be prerendered.
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  return Response.json({ languages: getLanguagesWithDictionary() });
}
