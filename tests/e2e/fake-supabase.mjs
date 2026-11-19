// A fake Supabase for the e2e tests (plan §3.2). Only the routes the game uses,
// answered the way PostgREST answers supabase-js: `.maybeSingle()` on a GET is
// a plain request whose JSON array is checked on the client (copied from a
// captured request, T0.5). No production code knows about this server: the
// Next server under test only gets SUPABASE_URL pointing here.
//
// /admin/juego (F2) also publishes, lists and reads versions; the state lives
// in memory and starts with the fixture published as version 1.
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

function readBody(request) {
  return new Promise((resolve) => {
    let text = "";
    request.on("data", (chunk) => (text += chunk));
    request.on("end", () => resolve(text));
  });
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

    return json(response, 404, { message: "not in the fake" });
  })
  .listen(port, "127.0.0.1");
