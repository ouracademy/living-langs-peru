import { createHash, timingSafeEqual } from "node:crypto";

/**
 * HTTP Basic Auth for everything under /admin and /api/admin. Shared on
 * purpose: it knows nothing about photos, so /admin/lenguas reuses it as is.
 * `src/proxy.ts` runs it first, and every admin Route Handler runs it again,
 * so a matcher mistake never leaves an endpoint open.
 */

/** `process.env` or a test double; only ADMIN_USER and ADMIN_PASSWORD are read. */
export type AdminEnv = Readonly<Record<string, string | undefined>>;

export type BasicAuthResult = "ok" | "missing_config" | "unauthorized";

const REALM = 'Basic realm="Edición", charset="UTF-8"';
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

// Hashing first gives both sides the same length, which timingSafeEqual
// requires, without leaking the length of the expected value.
function safeEqual(received: string, expected: string): boolean {
  return timingSafeEqual(digest(received), digest(expected));
}

function decodeCredentials(
  header: string,
): { user: string; password: string } | null {
  const match = /^basic\s+(\S+)\s*$/i.exec(header);
  if (!match || !BASE64.test(match[1])) return null;

  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  if (colon === -1) return null;

  return { user: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
}

export function checkBasicAuth(
  header: string | null,
  env: AdminEnv = process.env,
): BasicAuthResult {
  const expectedUser = env.ADMIN_USER?.trim();
  const expectedPassword = env.ADMIN_PASSWORD?.trim();
  // Checked before the header: a deployment without credentials must never
  // be open, nor ask for a password that does not exist.
  if (!expectedUser || !expectedPassword) return "missing_config";

  const credentials = header ? decodeCredentials(header) : null;
  if (!credentials) return "unauthorized";

  // Both comparisons always run, so timing does not reveal which one failed.
  const userMatches = safeEqual(credentials.user, expectedUser);
  const passwordMatches = safeEqual(credentials.password, expectedPassword);
  return userMatches && passwordMatches ? "ok" : "unauthorized";
}

export function unauthorizedResponse(): Response {
  return new Response("Necesitas usuario y contraseña de edición.", {
    status: 401,
    headers: {
      "WWW-Authenticate": REALM,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function missingConfigResponse(): Response {
  return new Response("Edición no configurada. Avisa al equipo técnico.", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** The response to send instead of the request, or `null` to let it through. */
export function adminAuthResponse(
  header: string | null,
  env: AdminEnv = process.env,
): Response | null {
  switch (checkBasicAuth(header, env)) {
    case "ok":
      return null;
    case "missing_config":
      return missingConfigResponse();
    case "unauthorized":
      return unauthorizedResponse();
  }
}
