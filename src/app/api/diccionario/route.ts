import { getLanguagesWithContent } from "@/lib/dictionary/content";

// No request data is read: prerendered, and regenerated with the bundles.
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  return Response.json({ languages: await getLanguagesWithContent() });
}
