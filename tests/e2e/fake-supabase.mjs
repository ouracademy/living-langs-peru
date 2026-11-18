// A fake Supabase for the e2e tests (plan §3.2). Only the routes the game uses,
// answered the way PostgREST answers supabase-js: `.maybeSingle()` on a GET is
// a plain request whose JSON array is checked on the client (copied from a
// captured request, T0.5). No production code knows about this server: the
// Next server under test only gets SUPABASE_URL pointing here.
//
// Pack fixtures use words marked PRUEBA, never real language (spec §13).

import { readFileSync } from "node:fs";
import http from "node:http";

const port = Number(process.env.FAKE_SUPABASE_PORT ?? 54329);

const packs = {
  ashaninka: JSON.parse(
    readFileSync(
      new URL("./fixtures/word-jump-pack.json", import.meta.url),
      "utf8",
    ),
  ),
};

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

http
  .createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

    // Readiness check for Playwright's webServer.
    if (url.pathname === "/") return json(response, 200, { ok: true });

    if (
      request.method === "GET" &&
      url.pathname === "/rest/v1/language_packs"
    ) {
      const filter = url.searchParams.get("language") ?? "";
      const language = filter.startsWith("eq.") ? filter.slice(3) : "";
      const pack = packs[language];

      return json(
        response,
        200,
        pack
          ? [{ version: 1, pack, published_at: "2026-11-18T00:00:00+00:00" }]
          : [],
      );
    }

    return json(response, 404, { message: "not in the fake" });
  })
  .listen(port, "127.0.0.1");
