import { randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";

import { adminAuthResponse } from "@/lib/admin/basic-auth";
import {
  applyAction,
  GALLERY_SLUG,
  type GalleryAction,
  type GalleryActionError,
  newPhotoName,
} from "@/lib/admin/gallery";
import {
  GALLERY_ERROR_MESSAGES,
  type GalleryErrorCode,
  readGallery,
} from "@/lib/admin/gallery-source";
import { inspectPhoto } from "@/lib/admin/photo-file";
import {
  creditFrom,
  photoFieldProblems,
  type PhotoFieldProblems,
  type PhotoFields,
  trimFields,
} from "@/lib/admin/photo-fields";
import { ashaninka, type Photo } from "@/lib/peoples";
import { galleryTag } from "@/lib/peoples/gallery-photos";
import {
  deleteGalleryPhoto,
  saveGalleryRow,
  uploadGalleryPhoto,
} from "@/lib/peoples/gallery-store";
import {
  galleryObjectPath,
  galleryObjectPathOf,
  galleryPublicBase,
} from "@/lib/peoples/gallery-url";
import { getOptionalSupabase } from "@/lib/supabase-optional";

const NO_STORE = { "Cache-Control": "no-store" };

const STATUS: Record<GalleryErrorCode, number> = {
  supabase_not_configured: 503,
  gallery_unavailable: 502,
};

/** The gallery as stored right now, uncached (spec #10). */
export async function GET(request: Request): Promise<Response> {
  // Checked again here on purpose: the proxy matcher is not the only barrier.
  const denied = adminAuthResponse(request.headers.get("authorization"));
  if (denied) return denied;

  const result = await readGallery(getOptionalSupabase());
  if (!result.ok) {
    return Response.json(
      { error: result.error, message: GALLERY_ERROR_MESSAGES[result.error] },
      { status: STATUS[result.error], headers: NO_STORE },
    );
  }

  return Response.json(result.value, { headers: NO_STORE });
}

type SaveErrorCode = GalleryErrorCode | GalleryActionError | "version_conflict";

const SAVE_STATUS: Record<SaveErrorCode, number> = {
  ...STATUS,
  photo_invalid: 400,
  gallery_full: 400,
  photo_not_found: 404,
  version_conflict: 409,
};

const SAVE_MESSAGES: Record<SaveErrorCode, string> = {
  ...GALLERY_ERROR_MESSAGES,
  gallery_unavailable:
    "No pudimos guardar en este momento. Intenta de nuevo en unos minutos.",
  photo_invalid: "Revisa la foto y los campos marcados.",
  gallery_full:
    "La galería ya tiene 24 fotos. Quita una antes de agregar otra.",
  photo_not_found: "Esa foto ya no está en la galería. Recarga la página.",
  version_conflict: "Alguien guardó antes. Recarga y vuelve a intentar.",
};

const SAVED_MESSAGES: Record<GalleryAction["type"], string> = {
  add: "Foto guardada. Ya está en la galería.",
  edit: "Cambios guardados. Ya están en la galería.",
  move: "Orden guardado. Ya está en la galería.",
  remove: "Foto quitada de la galería.",
};

function failure(
  error: SaveErrorCode,
  extra: { message?: string; fields?: PhotoFieldProblems } = {},
): Response {
  return Response.json(
    { error, message: extra.message ?? SAVE_MESSAGES[error], ...extra },
    { status: SAVE_STATUS[error], headers: NO_STORE },
  );
}

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(): string {
  return Array.from(
    randomBytes(6),
    (byte) => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length],
  ).join("");
}

const MISSING_VERSION = "Falta la versión de la galería. Recarga la página.";

/** `version` as the editor read it: a whole number, 0 before the first save. */
function parseVersion(value: unknown): number | null {
  const text =
    typeof value === "number" ? String(value) : (value as string | null);
  if (typeof text !== "string" || !/^\d{1,9}$/.test(text)) return null;
  return Number(text);
}

/** Auth and the server client, shared by every saving method. */
function writeAccess(request: Request): Response | SupabaseClient {
  // Checked again here on purpose: the proxy matcher is not the only barrier.
  const denied = adminAuthResponse(request.headers.get("authorization"));
  if (denied) return denied;

  const client = getOptionalSupabase();
  if (!client) return failure("supabase_not_configured");
  return client;
}

type Upload = { path: string; bytes: Uint8Array };

/**
 * The one way a save happens, whatever the action (spec #3): check the
 * version the editor saw, apply the action, validate the whole list (spec #9),
 * upload the new file if there is one, save the list, and only then delete a
 * removed file. A failed save deletes what it uploaded.
 */
async function save(
  client: SupabaseClient,
  expectedVersion: number,
  action: GalleryAction,
  upload?: Upload,
): Promise<Response> {
  const current = await readGallery(client);
  if (!current.ok) return failure(current.error);
  // Cheap early answer; save_gallery's version check is the real guard.
  if (current.value.version !== expectedVersion) {
    return failure("version_conflict");
  }

  const applied = applyAction(
    { ...ashaninka, photos: current.value.photos },
    action,
  );
  if (!applied.ok) {
    // Moving past an end has a readable message; anything else from
    // validatePeople is technical, so the generic one goes.
    const readable =
      applied.error === "photo_invalid" && action.type === "move";
    return failure(
      applied.error,
      readable ? { message: applied.problems[0] } : {},
    );
  }

  if (
    upload &&
    !(await uploadGalleryPhoto(client, upload.path, upload.bytes))
  ) {
    return failure("gallery_unavailable");
  }

  const saved = await saveGalleryRow(
    client,
    GALLERY_SLUG,
    applied.people.photos,
    expectedVersion,
  );
  if (!saved.ok) {
    if (upload) await deleteGalleryPhoto(client, upload.path);
    return failure(saved.error);
  }

  // A photo in public/ only leaves the list; one in the bucket loses its file
  // too (spec #18). Never anything outside this gallery's folder.
  const removedPath = applied.removed
    ? galleryObjectPathOf(
        applied.removed.src,
        GALLERY_SLUG,
        process.env.SUPABASE_URL,
      )
    : null;
  if (removedPath) await deleteGalleryPhoto(client, removedPath);

  // "max", never revalidatePath: the last good page survives a failed
  // regeneration (spec #15).
  revalidateTag(galleryTag(GALLERY_SLUG), "max");

  // Action and version only (AC-E3-10): no key, no credentials, no texts.
  console.info("admin/fotos: saved", action.type, saved.version);
  return Response.json(
    {
      ok: true,
      version: saved.version,
      // The list as saved, so the editor shows it right away.
      photos: applied.people.photos,
      ...(action.type === "add" ? { photo: action.photo } : {}),
      message: SAVED_MESSAGES[action.type],
    },
    { status: action.type === "add" ? 201 : 200, headers: NO_STORE },
  );
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Adds one photo (spec §6.2). The photo arrives already reduced by the
 * browser; nothing it claims is trusted.
 */
export async function POST(request: Request): Promise<Response> {
  const access = writeAccess(request);
  if (access instanceof Response) return access;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure("photo_invalid", {
      message: "No pudimos leer el formulario. Intenta de nuevo.",
    });
  }

  const expectedVersion = parseVersion(form.get("version"));
  if (expectedVersion === null) {
    return failure("photo_invalid", { message: MISSING_VERSION });
  }

  const fields: PhotoFields = trimFields({
    alt: text(form, "alt"),
    caption: text(form, "caption"),
    author: text(form, "author"),
    license: text(form, "license"),
    url: text(form, "url"),
  });
  const problems = photoFieldProblems(fields);
  if (Object.keys(problems).length > 0) {
    return failure("photo_invalid", { fields: problems });
  }

  const file = form.get("photo");
  if (!(file instanceof Blob)) {
    return failure("photo_invalid", { message: "Elige una foto." });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspection = inspectPhoto(bytes);
  if (!inspection.ok) {
    return failure("photo_invalid", { message: inspection.message });
  }

  const base = galleryPublicBase(process.env.SUPABASE_URL);
  if (!base) return failure("supabase_not_configured");
  const path = galleryObjectPath(
    GALLERY_SLUG,
    newPhotoName(new Date(), randomSuffix()),
  );

  const photo: Photo = {
    src: `${base}/${path}`,
    // From the bytes, never from the form (decision #7, AC-E3-3).
    width: inspection.width,
    height: inspection.height,
    alt: fields.alt,
    ...(fields.caption ? { caption: fields.caption } : {}),
    // Empty author or license become the team's credit; no url, no link.
    credit: creditFrom(fields),
  };

  return save(access, expectedVersion, { type: "add", photo }, { path, bytes });
}

type JsonBody = Record<string, unknown>;

async function readJson(request: Request): Promise<JsonBody | null> {
  try {
    const data: unknown = await request.json();
    return typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as JsonBody)
      : null;
  } catch {
    return null;
  }
}

function string(body: JsonBody, name: string): string {
  const value = body[name];
  return typeof value === "string" ? value : "";
}

/** The `version` and `src` every change to an existing photo carries. */
function target(
  body: JsonBody | null,
): { expectedVersion: number; src: string } | Response {
  if (!body) {
    return failure("photo_invalid", {
      message: "No pudimos leer el pedido. Intenta de nuevo.",
    });
  }
  const expectedVersion = parseVersion(body.version);
  if (expectedVersion === null) {
    return failure("photo_invalid", { message: MISSING_VERSION });
  }
  const src = string(body, "src");
  if (!src) return failure("photo_not_found");
  return { expectedVersion, src };
}

/**
 * Changes an existing photo without touching its file: `edit` (texts and
 * credit) or `move` (one place up or down).
 */
export async function PATCH(request: Request): Promise<Response> {
  const access = writeAccess(request);
  if (access instanceof Response) return access;

  const body = await readJson(request);
  const found = target(body);
  if (found instanceof Response) return found;
  const { expectedVersion, src } = found;
  const action = string(body as JsonBody, "action");

  if (action === "move") {
    const direction = string(body as JsonBody, "direction");
    if (direction !== "up" && direction !== "down") {
      return failure("photo_invalid", {
        message: "No entendimos hacia dónde mover la foto.",
      });
    }
    return save(access, expectedVersion, { type: "move", src, direction });
  }

  if (action === "edit") {
    const fields = trimFields({
      alt: string(body as JsonBody, "alt"),
      caption: string(body as JsonBody, "caption"),
      author: string(body as JsonBody, "author"),
      license: string(body as JsonBody, "license"),
      url: string(body as JsonBody, "url"),
    });
    const problems = photoFieldProblems(fields);
    if (Object.keys(problems).length > 0) {
      return failure("photo_invalid", { fields: problems });
    }
    return save(access, expectedVersion, {
      type: "edit",
      src,
      alt: fields.alt,
      ...(fields.caption ? { caption: fields.caption } : {}),
      credit: creditFrom(fields),
    });
  }

  return failure("photo_invalid", {
    message: "No entendimos qué cambio guardar.",
  });
}

/** Removes a photo from the list, and its file if it is in the bucket. */
export async function DELETE(request: Request): Promise<Response> {
  const access = writeAccess(request);
  if (access instanceof Response) return access;

  const found = target(await readJson(request));
  if (found instanceof Response) return found;

  return save(access, found.expectedVersion, {
    type: "remove",
    src: found.src,
  });
}
