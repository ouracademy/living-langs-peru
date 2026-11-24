import { revalidateTag } from "next/cache";

import {
  adminError,
  adminJson,
  openBundleRequest,
  readJsonBody,
  UNAVAILABLE_MESSAGE,
} from "@/lib/language-bundles/admin-route";
import { bundleTag } from "@/lib/language-bundles/library";
import { readBundlePublishRequest } from "@/lib/language-bundles/publish-request";
import {
  publishBundle,
  type PublishError,
} from "@/lib/language-bundles/publishing";

type Context = { params: Promise<{ lengua: string }> };

const PUBLISH_FAILURES: Record<
  PublishError,
  { status: number; message: string }
> = {
  version_conflict: {
    status: 409,
    message:
      "Alguien publicó otra versión mientras trabajabas. Descarga la publicada para compararla, o publica igual.",
  },
  language_mismatch: {
    status: 400,
    message: "El paquete es de otra lengua.",
  },
  unavailable: { status: 502, message: UNAVAILABLE_MESSAGE },
};

/**
 * Publishes a language bundle (spec gestor-lenguas §5): validated again here
 * whatever the browser did, with a note, and the dictionary and both games
 * invalidated with `revalidateTag(…, "max")` only. No `revalidatePath`: it
 * discards the page, and a failing Supabase would then answer 500 instead of
 * the last good content (decision #5).
 */
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language } = await params;
  const opened = openBundleRequest(request, language);
  if (opened instanceof Response) return opened;

  const read = readBundlePublishRequest(
    await readJsonBody(request),
    opened.language,
    opened.audioBaseUrl,
  );
  if (!read.ok) {
    return adminError(400, read.error, read.message, {
      ...(read.issues ? { issues: read.issues } : {}),
      ...(read.problems ? { problems: read.problems } : {}),
    });
  }

  const published = await publishBundle(opened.client, {
    language: opened.language,
    bundle: read.bundle,
    expectedVersion: read.expectedVersion,
    note: read.note,
  });
  if (!published.ok) {
    const failure = PUBLISH_FAILURES[published.error];
    return adminError(failure.status, published.error, failure.message);
  }

  revalidateTag(bundleTag(opened.language), "max");

  return adminJson({
    ok: true,
    version: published.version,
    message: `Publicada la versión ${published.version}. El diccionario y los juegos la mostrarán en la siguiente visita o la que sigue.`,
  });
}
