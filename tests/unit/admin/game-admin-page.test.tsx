import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testPack } from "../language-packs/fixtures";
import { fakePackClient, type Asked } from "../language-packs/fake-pack-client";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const requestHeaders = vi.fn(async () => new Headers());
vi.mock("next/headers", () => ({ headers: requestHeaders }));

let client: SupabaseClient;
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => client }));

const { default: AdminGamePage, metadata } =
  await import("@/app/admin/juego/page");

const AUTH = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;

function withAuthorization(value: string | null) {
  requestHeaders.mockResolvedValue(
    new Headers(value ? { authorization: value } : {}),
  );
}

function databaseWith(
  answer: (asked: Asked) => { data: unknown; error: unknown },
) {
  client = fakePackClient({ from: answer }).client;
}

beforeEach(() => {
  vi.stubEnv("ADMIN_USER", "editora");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
  vi.stubEnv("SUPABASE_URL", "https://proyecto.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "clave-de-prueba-no-real");
  vi.spyOn(console, "error").mockImplementation(() => {});
  withAuthorization(AUTH);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/admin/juego", () => {
  it("is never indexed", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  // AC-SP5-8
  it("shows nothing and reads nothing without valid credentials", async () => {
    withAuthorization(null);
    const from = vi.fn(() => ({ data: null, error: null }));
    databaseWith(from);

    render(await AdminGamePage());

    expect(
      screen.getByRole("heading", { name: "Acceso restringido" }),
    ).toBeTruthy();
    expect(from).not.toHaveBeenCalled();
  });

  it("says when Supabase is not configured", async () => {
    vi.stubEnv("SUPABASE_URL", "");

    render(await AdminGamePage());

    expect(screen.getByRole("alert").textContent).toContain(
      "Supabase no está configurado",
    );
  });

  it("shows each language: the published pack, and uro without a game", async () => {
    databaseWith((asked) =>
      asked.table === "language_packs"
        ? {
            data: {
              version: 1,
              pack: testPack(),
              note: "Primera versión PRUEBA",
              published_at: "2026-11-18T15:00:00Z",
            },
            error: null,
          }
        : {
            data: [
              {
                version: 1,
                note: "Primera versión PRUEBA",
                published_at: "2026-11-18T15:00:00Z",
              },
            ],
            error: null,
          },
    );

    render(await AdminGamePage());

    expect(screen.getByRole("heading", { name: "Asháninka" })).toBeTruthy();
    expect(screen.getByText(/«Primera versión PRUEBA»/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Uro" })).toBeTruthy();
    expect(screen.getByText(/Sin juego, por diseño/)).toBeTruthy();
  });

  it("says when a language cannot be read", async () => {
    databaseWith(() => ({ data: null, error: { code: "PGRST000" } }));

    render(await AdminGamePage());

    expect(screen.getByRole("alert").textContent).toContain(
      "No pudimos leer esta lengua",
    );
  });
});
