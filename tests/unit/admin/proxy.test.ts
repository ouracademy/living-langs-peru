import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config, proxy } from "@/proxy";

const request = (path: string, authorization?: string) =>
  new NextRequest(`http://localhost${path}`, {
    headers: authorization ? { authorization } : {},
  });

const valid = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;

beforeEach(() => {
  vi.stubEnv("ADMIN_USER", "editora");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy", () => {
  // AC-E1-1
  it("answers 401 without credentials", () => {
    expect(proxy(request("/admin/fotos"))?.status).toBe(401);
  });

  it("lets valid credentials through", () => {
    expect(proxy(request("/admin/fotos", valid))).toBeUndefined();
  });

  // AC-E1-2
  it("answers 503 when the credentials are not configured", () => {
    vi.stubEnv("ADMIN_USER", "");

    expect(proxy(request("/admin/fotos", valid))?.status).toBe(503);
  });

  // AC-E1-4: the matcher is what keeps public pages out of the proxy.
  it("only matches the admin area", () => {
    expect(config.matcher).toEqual(["/admin/:path*", "/api/admin/:path*"]);
  });
});
