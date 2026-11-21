import { revalidateTag } from "next/cache";

import {
  adminError,
  adminJson,
  openAdminRequest,
  readJsonBody,
  UNAVAILABLE_MESSAGE,
} from "@/lib/language-packs/admin-route";
import { packTag } from "@/lib/language-packs/library";
import { readPublishRequest } from "@/lib/language-packs/publish-request";
import {
  publishPack,
  type PublishError,
} from "@/lib/language-packs/publishing";

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
 * Publishes a pack (spec §9.1): validated again here whatever the browser did
 * (AC-SP6-6), with a note (AC-SP6-12), and the public page invalidated with
 * `revalidateTag(…, "max")` only. No `revalidatePath`: it discards the page,
 * and a failing Supabase would then answer 500 instead of the last good pack
 * (spec §6.4, F0 finding).
 */
export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { lengua: language } = await params;
  const opened = openAdminRequest(request, language);
  if (opened instanceof Response) return opened;

  const read = readPublishRequest(
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

  const published = await publishPack(opened.client, {
    language: opened.language,
    pack: read.pack,
    expectedVersion: read.expectedVersion,
    note: read.note,
  });
  if (!published.ok) {
    const failure = PUBLISH_FAILURES[published.error];
    return adminError(failure.status, published.error, failure.message);
  }

  revalidateTag(packTag(opened.language), "max");

  return adminJson({
    ok: true,
    version: published.version,
    message: `Publicada la versión ${published.version}. La página del juego la mostrará en la siguiente visita o la que sigue.`,
  });
}
