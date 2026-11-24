import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testBundle } from "../language-bundles/fixtures";
import { fakePackClient, type Asked } from "../language-packs/fake-pack-client";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/lenguas/uro",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const requestHeaders = vi.fn(async () => new Headers());
vi.mock("next/headers", () => ({ headers: requestHeaders }));

let client: SupabaseClient;
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => client }));

const { default: AdminLanguagesPage, metadata: listMetadata } =
  await import("@/app/admin/lenguas/page");
const { default: AdminLanguagePage, metadata: pageMetadata } =
  await import("@/app/admin/lenguas/[lengua]/page");

const AUTH = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;
const ROW = {
  version: 4,
  bundle: testBundle(),
  note: "Revisado por PRUEBA",
  published_at: "2026-11-22T10:00:00+00:00",
};

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

const params = (lengua: string) => ({ params: Promise.resolve({ lengua }) });

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

describe("/admin/lenguas", () => {
  it("is never indexed", () => {
    expect(listMetadata.robots).toEqual({ index: false, follow: false });
    expect(pageMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("shows nothing and reads nothing without valid credentials", async () => {
    withAuthorization(null);
    const from = vi.fn(() => ({ data: null, error: null }));
    databaseWith(from);

    render(await AdminLanguagesPage());
    render(await AdminLanguagePage(params("uro")));

    expect(
      screen.getAllByRole("heading", { name: "Acceso restringido" }),
    ).toHaveLength(2);
    expect(from).not.toHaveBeenCalled();
  });

  it("lists both languages with what is published, linking to each", async () => {
    databaseWith((asked) =>
      asked.filters.some(([, value]) => value === "uro")
        ? { data: ROW, error: null }
        : { data: null, error: null },
    );

    render(await AdminLanguagesPage());

    const uro = screen.getByRole("link", { name: /Uro/ });
    expect(uro.getAttribute("href")).toBe("/admin/lenguas/uro");
    expect(uro.textContent).toMatch(/Versión 4/);
    expect(uro.textContent).toMatch(/3 de 3 palabras verificadas/);
    expect(screen.getByRole("link", { name: /Asháninka/ }).textContent).toMatch(
      /Sin publicar/,
    );
  });

  it("says when the database cannot be read or Supabase is missing", async () => {
    databaseWith(() => ({ data: null, error: { code: "x" } }));
    render(await AdminLanguagesPage());
    expect(
      screen.getAllByText(/No pudimos leer esta lengua/).length,
    ).toBeGreaterThan(0);
    cleanup();

    vi.stubEnv("SUPABASE_URL", "");
    render(await AdminLanguagesPage());
    expect(screen.getByRole("alert").textContent).toMatch(
      /Supabase no está configurado/,
    );
  });
});

describe("/admin/lenguas/[lengua]", () => {
  it("is a 404 for a language outside the two of the site", async () => {
    await expect(AdminLanguagePage(params("klingon"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("shows what is published and the history", async () => {
    databaseWith((asked) =>
      asked.table === "bundle_versions"
        ? {
            data: [
              {
                version: 4,
                note: ROW.note,
                published_at: ROW.published_at,
              },
            ],
            error: null,
          }
        : { data: ROW, error: null },
    );

    render(await AdminLanguagePage(params("uro")));

    expect(screen.getByRole("heading", { level: 1, name: "Uro" })).toBeTruthy();
    expect(screen.getByText(/3 de 3 palabras verificadas/)).toBeTruthy();
    expect(screen.getByText("Versión 4 (publicada)")).toBeTruthy();
    expect(screen.getByText("Subir JSON")).toBeTruthy();
  });

  it("says when the database cannot be read or Supabase is missing", async () => {
    databaseWith(() => ({ data: null, error: { code: "x" } }));
    render(await AdminLanguagePage(params("uro")));
    expect(screen.getByRole("alert").textContent).toMatch(
      /No pudimos leer esta lengua/,
    );
    cleanup();

    vi.stubEnv("SUPABASE_URL", "");
    render(await AdminLanguagePage(params("uro")));
    expect(screen.getByRole("alert").textContent).toMatch(
      /Supabase no está configurado/,
    );
  });
});
