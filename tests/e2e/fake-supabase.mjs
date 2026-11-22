// A fake Supabase for the e2e tests (plan §3.2). Only the routes the game uses,
// answered the way PostgREST answers supabase-js: `.maybeSingle()` on a GET is
// a plain request whose JSON array is checked on the client (copied from a
// captured request, T0.5). No production code knows about this server: the
// Next server under test only gets SUPABASE_URL pointing here.
//
// /admin/juego (F2) also publishes, lists and reads versions; the state lives
// in memory and starts with the fixture published as version 1.
//
// The photo gallery (tasks/edicion-fotos F5) reads and saves `galleries` and
// uploads, serves and deletes files of the `gallery` bucket. It starts with no
// row, so /ashaninka shows the repo's photos (the fallback).
//
// Pack fixtures use words marked PRUEBA, never real language (spec §13).

import { readFileSync } from "node:fs";
import http from "node:http";

const port = Number(process.env.FAKE_SUPABASE_PORT ?? 54329);

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/word-jump-pack.json", import.meta.url),
    "utf8",
  ),
);

const FIRST_PUBLISHED_AT = "2026-11-18T00:00:00+00:00";

/** language → the published row. */
const current = new Map([
  [
    "ashaninka",
    {
      version: 1,
      pack: fixture,
      note: "Paquete de PRUEBA",
      published_at: FIRST_PUBLISHED_AT,
    },
  ],
]);
/** slug → the published language bundle row; empty until F2 publishes. */
const bundles = new Map();
/** slug → every published bundle version, oldest first. */
const bundleHistory = new Map();
/** language → every version, oldest first. */
const history = new Map([["ashaninka", [current.get("ashaninka")]]]);

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

/** PostgREST's `column=eq.value` filter. */
function equals(url, column) {
  const filter = url.searchParams.get(column) ?? "";
  return filter.startsWith("eq.") ? filter.slice(3) : null;
}

/** PostgREST's `select=a,b` projection. */
function project(url, row) {
  const columns = (url.searchParams.get("select") ?? "*")
    .split(",")
    .map((column) => column.trim());
  if (columns.includes("*")) return row;
  return Object.fromEntries(columns.map((column) => [column, row[column]]));
}

function readBytes(request) {
  return new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function readBody(request) {
  return (await readBytes(request)).toString("utf8");
}

/** slug → { version, photos }. */
const galleries = new Map();
/** bucket path → { bytes, type }. */
const galleryFiles = new Map();

/** Same checks and errors as save_gallery (docs/edicion-fotos-schema.sql). */
function saveGallery({ p_slug, p_photos, p_expected_version }) {
  if (!Array.isArray(p_photos) || p_photos.length > 24) {
    return { status: 400, body: { code: "22023", message: "bad photos" } };
  }
  const found = galleries.get(p_slug)?.version ?? 0;
  if (p_expected_version !== found) {
    return {
      status: 409,
      body: { code: "40001", message: "version conflict" },
    };
  }
  galleries.set(p_slug, { version: found + 1, photos: p_photos });
  return { status: 200, body: found + 1 };
}

const BUCKET_OBJECT = "/storage/v1/object/gallery/";
const BUCKET_PUBLIC = "/storage/v1/object/public/gallery/";

/** Same checks and errors as publish_language_bundle (docs/gestor-lenguas-schema.sql). */
function publishBundle({ p_slug, p_bundle, p_expected_version, p_note }) {
  if (p_bundle?.language !== p_slug) {
    return {
      status: 400,
      body: { code: "22023", message: "language mismatch" },
    };
  }
  const found = bundles.get(p_slug)?.version ?? 0;
  if (p_expected_version !== null && p_expected_version !== found) {
    return {
      status: 409,
      body: { code: "40001", message: "version conflict" },
    };
  }
  const row = {
    version: found + 1,
    bundle: p_bundle,
    note: p_note,
    published_at: new Date().toISOString(),
  };
  bundles.set(p_slug, row);
  bundleHistory.set(p_slug, [...(bundleHistory.get(p_slug) ?? []), row]);
  return { status: 200, body: row.version };
}

/** Same checks and errors as publish_language_pack (docs/saltapalabras-schema.sql). */
function publish({ p_language, p_pack, p_expected_version, p_note }) {
  if (p_pack?.language?.slug !== p_language) {
    return {
      status: 400,
      body: { code: "22023", message: "language mismatch" },
    };
  }
  const found = current.get(p_language)?.version ?? 0;
  if (p_expected_version !== null && p_expected_version !== found) {
    return {
      status: 409,
      body: { code: "40001", message: "version conflict" },
    };
  }
  const row = {
    version: found + 1,
    pack: p_pack,
    note: p_note,
    published_at: new Date().toISOString(),
  };
  current.set(p_language, row);
  history.set(p_language, [...(history.get(p_language) ?? []), row]);
  return { status: 200, body: row.version };
}

http
  .createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

    // Readiness check for Playwright's webServer.
    if (url.pathname === "/") return json(response, 200, { ok: true });

    if (
      request.method === "GET" &&
      url.pathname === "/rest/v1/language_packs"
    ) {
      const row = current.get(equals(url, "language"));
      return json(response, 200, row ? [project(url, row)] : []);
    }

    // Language bundles (gestor-lenguas F1): none published, so the site
    // shows the repo's bundle, as it does before anyone publishes one.
    if (
      request.method === "GET" &&
      url.pathname === "/rest/v1/language_bundles"
    ) {
      const row = bundles.get(equals(url, "slug"));
      return json(response, 200, row ? [project(url, row)] : []);
    }

    if (
      request.method === "GET" &&
      url.pathname === "/rest/v1/bundle_versions"
    ) {
      const rows = bundleHistory.get(equals(url, "slug")) ?? [];
      const version = equals(url, "version");
      const chosen =
        version === null
          ? [...rows].reverse()
          : rows.filter((row) => row.version === Number(version));
      return json(
        response,
        200,
        chosen.map((row) => project(url, row)),
      );
    }

    if (
      request.method === "POST" &&
      url.pathname === "/rest/v1/rpc/publish_language_bundle"
    ) {
      const answer = publishBundle(JSON.parse(await readBody(request)));
      return json(response, answer.status, answer.body);
    }

    if (request.method === "GET" && url.pathname === "/rest/v1/pack_versions") {
      const rows = history.get(equals(url, "language")) ?? [];
      const version = equals(url, "version");
      const chosen =
        version === null
          ? [...rows].reverse()
          : rows.filter((row) => row.version === Number(version));
      return json(
        response,
        200,
        chosen.map((row) => project(url, row)),
      );
    }

    if (
      request.method === "POST" &&
      url.pathname === "/rest/v1/rpc/publish_language_pack"
    ) {
      const answer = publish(JSON.parse(await readBody(request)));
      return json(response, answer.status, answer.body);
    }

    if (request.method === "GET" && url.pathname === "/rest/v1/galleries") {
      const row = galleries.get(equals(url, "slug"));
      return json(response, 200, row ? [project(url, row)] : []);
    }

    if (
      request.method === "POST" &&
      url.pathname === "/rest/v1/rpc/save_gallery"
    ) {
      const answer = saveGallery(JSON.parse(await readBody(request)));
      return json(response, answer.status, answer.body);
    }

    if (request.method === "POST" && url.pathname.startsWith(BUCKET_OBJECT)) {
      const path = decodeURIComponent(url.pathname.slice(BUCKET_OBJECT.length));
      if (galleryFiles.has(path)) {
        return json(response, 409, { statusCode: "409", error: "Duplicate" });
      }
      galleryFiles.set(path, {
        bytes: await readBytes(request),
        type: request.headers["content-type"] ?? "image/jpeg",
      });
      return json(response, 200, { Id: path, Key: `gallery/${path}` });
    }

    if (
      request.method === "DELETE" &&
      url.pathname === "/storage/v1/object/gallery"
    ) {
      const { prefixes = [] } = JSON.parse(await readBody(request));
      const removed = prefixes.filter((path) => galleryFiles.delete(path));
      return json(
        response,
        200,
        removed.map((name) => ({ name })),
      );
    }

    if (request.method === "GET" && url.pathname.startsWith(BUCKET_PUBLIC)) {
      const file = galleryFiles.get(
        decodeURIComponent(url.pathname.slice(BUCKET_PUBLIC.length)),
      );
      if (!file) return json(response, 404, { message: "Object not found" });
      response.writeHead(200, { "content-type": file.type });
      return response.end(file.bytes);
    }

    return json(response, 404, { message: "not in the fake" });
  })
  .listen(port, "127.0.0.1");
