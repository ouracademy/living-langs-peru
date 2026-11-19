import { randomBytes } from "node:crypto";

import { adminAuthResponse } from "@/lib/admin/basic-auth";
import {
  applyAction,
  commitMessageFor,
  GALLERY_PHOTO_DIR,
  type GalleryAction,
  type GalleryActionError,
  newPhotoName,
  serializePeople,
} from "@/lib/admin/gallery";
import {
  GALLERY_ERROR_MESSAGES,
  GALLERY_FILE,
  type GalleryErrorCode,
  readGallery,
} from "@/lib/admin/gallery-source";
import {
  commitFiles,
  type CommitFile,
  type GitHubConfig,
  readBranchSha,
  readGitHubConfig,
  readRepoFileAt,
} from "@/lib/admin/github";
import { inspectPhoto } from "@/lib/admin/photo-file";
import {
  creditFrom,
  photoFieldProblems,
  type PhotoFieldProblems,
  type PhotoFields,
  trimFields,
} from "@/lib/admin/photo-fields";
import type { People, Photo } from "@/lib/peoples";

const NO_STORE = { "Cache-Control": "no-store" };

const STATUS: Record<GalleryErrorCode, number> = {
  github_not_configured: 503,
  github_unauthorized: 502,
  github_unavailable: 502,
  gallery_unreadable: 502,
};

/**
 * The gallery as it is on the branch right now, not as the running deployment
 * built it: an editor sees their last save even while Vercel is still
 * publishing (spec #10).
 */
export async function GET(request: Request): Promise<Response> {
  // Checked again here on purpose: the proxy matcher is not the only barrier.
  const denied = adminAuthResponse(request.headers.get("authorization"));
  if (denied) return denied;

  const result = await readGallery(readGitHubConfig(), fetch);
  if (!result.ok) {
    // The code only: never the token, the URL or the GitHub message.
    console.error("admin/fotos: read failed", result.error);
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
  photo_invalid: "Revisa la foto y los campos marcados.",
  gallery_full:
    "La galería ya tiene 24 fotos. Quita una antes de agregar otra.",
  photo_not_found: "Esa foto ya no está en la galería. Recarga la página.",
  version_conflict: "Alguien guardó antes. Recarga y vuelve a intentar.",
};

const SAVED_MESSAGES: Record<GalleryAction["type"], string> = {
  add: "Foto guardada. Se verá en la web en 1–2 minutos.",
  edit: "Cambios guardados. Se verán en la web en 1–2 minutos.",
  move: "Orden guardado. Se verá en la web en 1–2 minutos.",
  remove: "Foto quitada. Se verá en la web en 1–2 minutos.",
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

const SHA = /^[0-9a-f]{40}$/;
const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(): string {
  return Array.from(
    randomBytes(6),
    (byte) => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length],
  ).join("");
}

function parsePeople(content: string): People | null {
  try {
    const data: unknown = JSON.parse(content);
    return typeof data === "object" &&
      data !== null &&
      Array.isArray((data as { photos?: unknown }).photos)
      ? (data as People)
      : null;
  } catch {
    return null;
  }
}

const MISSING_SHA = "Falta la versión de la galería. Recarga la página.";

/** Auth and the write configuration, shared by every saving method. */
function writeAccess(request: Request): Response | GitHubConfig {
  // Checked again here on purpose: the proxy matcher is not the only barrier.
  const denied = adminAuthResponse(request.headers.get("authorization"));
  if (denied) return denied;

  const config = readGitHubConfig();
  // Writing needs the token; without it the save could never land.
  if (!config?.token) return failure("github_not_configured");
  return config;
}

/**
 * The one way a save happens, whatever the action: check the branch did not
 * move, read the file at the commit the editor saw, apply the action, validate
 * the whole file (spec #9), then one commit with every file involved.
 */
async function save(
  config: GitHubConfig,
  baseSha: string,
  action: GalleryAction,
  extraFiles: CommitFile[] = [],
): Promise<Response> {
  // Cheap early answer; the ref update without force is the real guard.
  const head = await readBranchSha(config, fetch);
  if (!head.ok) return failure(head.error);
  if (head.value !== baseSha) return failure("version_conflict");

  const current = await readRepoFileAt(config, GALLERY_FILE, baseSha, fetch);
  if (!current.ok) return failure(current.error);
  const people = parsePeople(current.value);
  if (!people) return failure("gallery_unreadable");

  const applied = applyAction(people, action);
  if (!applied.ok) {
    // Moving past an end and an out-of-folder src have readable messages;
    // anything else from validatePeople is technical, so the generic one goes.
    const readable =
      applied.error === "photo_invalid" &&
      (action.type === "move" || action.type === "remove");
    return failure(
      applied.error,
      readable ? { message: applied.problems[0] } : {},
    );
  }

  const committed = await commitFiles(
    config,
    {
      baseSha,
      files: [
        ...extraFiles,
        { path: GALLERY_FILE, content: await serializePeople(applied.people) },
      ],
      deletions: applied.deletedFile ? [applied.deletedFile] : [],
      message: commitMessageFor(action.type),
    },
    fetch,
  );
  if (!committed.ok) {
    console.error("admin/fotos: save failed", action.type, committed.error);
    return failure(committed.error);
  }

  // Action and commit only (AC-E3-10): no token, no credentials, no texts.
  console.info("admin/fotos: saved", action.type, committed.value);
  return Response.json(
    {
      ok: true,
      sha: committed.value,
      // The list as committed, so the editor can show it before Vercel deploys.
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

  const baseSha = text(form, "sha");
  if (!SHA.test(baseSha)) {
    return failure("photo_invalid", { message: MISSING_SHA });
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

  const photo: Photo = {
    src: `${GALLERY_PHOTO_DIR}/${newPhotoName(new Date(), randomSuffix())}`,
    // From the bytes, never from the form (decision #7, AC-E3-3).
    width: inspection.width,
    height: inspection.height,
    alt: fields.alt,
    ...(fields.caption ? { caption: fields.caption } : {}),
    // Empty author or license become the team's credit; no url, no link.
    credit: creditFrom(fields),
  };

  return save(access, baseSha, { type: "add", photo }, [
    { path: `public${photo.src}`, content: bytes },
  ]);
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

/** The `sha` and `src` every change to an existing photo carries. */
function target(
  body: JsonBody | null,
): { baseSha: string; src: string } | Response {
  if (!body) {
    return failure("photo_invalid", {
      message: "No pudimos leer el pedido. Intenta de nuevo.",
    });
  }
  const baseSha = string(body, "sha");
  if (!SHA.test(baseSha)) {
    return failure("photo_invalid", { message: MISSING_SHA });
  }
  const src = string(body, "src");
  if (!src) return failure("photo_not_found");
  return { baseSha, src };
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
  const { baseSha, src } = found;
  const action = string(body as JsonBody, "action");

  if (action === "move") {
    const direction = string(body as JsonBody, "direction");
    if (direction !== "up" && direction !== "down") {
      return failure("photo_invalid", {
        message: "No entendimos hacia dónde mover la foto.",
      });
    }
    return save(access, baseSha, { type: "move", src, direction });
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
    return save(access, baseSha, {
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

/** Removes a photo: its entry and its file, in the same commit (AC-E3-6). */
export async function DELETE(request: Request): Promise<Response> {
  const access = writeAccess(request);
  if (access instanceof Response) return access;

  const found = target(await readJson(request));
  if (found instanceof Response) return found;

  return save(access, found.baseSha, { type: "remove", src: found.src });
}
