// A stand-in for the two GitHub reads /admin/fotos makes on the server, so the
// e2e suite never reaches the real API (spec §8). Writes are refused: the
// browser tests intercept the save with page.route before it gets here.
//
// Started by playwright.config.ts as a webServer; Next points at it through
// GITHUB_API_URL. Plain node:http, no dependencies.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

const port = Number(process.env.FAKE_GITHUB_PORT ?? 3901);
// Not exported: importing this file would start the server.
const FAKE_HEAD_SHA = "e2e0".repeat(10);
const GALLERY = "src/data/peoples/ashaninka.json";

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const send = (status, body, type = "application/json") => {
    response.writeHead(status, { "Content-Type": type });
    response.end(typeof body === "string" ? body : JSON.stringify(body));
  };

  if (url.pathname === "/health") return send(200, { ok: true });
  if (request.method !== "GET") {
    return send(403, { message: "The fake GitHub is read-only." });
  }
  if (/^\/repos\/[^/]+\/[^/]+\/git\/ref\/heads\/.+$/.test(url.pathname)) {
    return send(200, { object: { sha: FAKE_HEAD_SHA, type: "commit" } });
  }
  if (url.pathname.endsWith(`/contents/${GALLERY}`)) {
    // Read on every request, as GitHub would answer with the latest commit.
    const file = readFileSync(join(process.cwd(), GALLERY), "utf8");
    return send(200, file.replace(/\r\n/g, "\n"), "text/plain; charset=utf-8");
  }
  return send(404, { message: "Not Found" });
});

server.listen(port, "127.0.0.1");
