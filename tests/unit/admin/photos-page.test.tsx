import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  credentials,
  fakeGallerySupabase,
  repoPhotos,
  stubAdminEnv,
} from "./fake-gallery-supabase";

const requestHeaders = vi.fn(async () => new Headers());
vi.mock("next/headers", () => ({ headers: requestHeaders }));
// The editor refreshes the route after a save; there is no app router here.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("server-only", () => ({}));

let fake: ReturnType<typeof fakeGallerySupabase> | null = null;
vi.mock("@/lib/supabase-optional", () => ({
  getOptionalSupabase: () => fake?.client ?? null,
}));

const { default: AdminPhotosPage, metadata } =
  await import("@/app/admin/fotos/page");

function withAuthorization(value: string | null) {
  requestHeaders.mockResolvedValue(
    new Headers(value ? { authorization: value } : {}),
  );
}

beforeEach(() => {
  stubAdminEnv(vi);
  fake = fakeGallerySupabase();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/admin/fotos", () => {
  // AC-E1-5
  it("is never indexed", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("shows nothing of the gallery without valid credentials", async () => {
    withAuthorization(null);

    render(await AdminPhotosPage());

    expect(
      screen.getByRole("heading", { name: "Acceso restringido" }),
    ).toBeTruthy();
    expect(fake?.reads).toHaveLength(0);
  });

  // AC-E2-1: before the first save, the repo's five photos.
  it("lists the repo's five photos in order when there is no row yet", async () => {
    withAuthorization(credentials);

    render(await AdminPhotosPage());

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    repoPhotos.forEach((photo, index) => {
      expect(items[index].textContent).toContain(photo.alt);
    });
    expect(screen.getByText(/se publica al guardar/)).toBeTruthy();
    expect(screen.getByText(/cierra el navegador/)).toBeTruthy();
  });

  // AC-E2-1
  it("lists the stored photos in their order", async () => {
    withAuthorization(credentials);
    fake = fakeGallerySupabase({
      row: { version: 2, photos: [repoPhotos[3], repoPhotos[1]] },
    });

    render(await AdminPhotosPage());

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain(repoPhotos[3].alt);
  });

  // AC-E2-2
  it("shows the error and no list when Supabase cannot be read", async () => {
    withAuthorization(credentials);
    fake = fakeGallerySupabase({ readError: { code: "08006" } });

    render(await AdminPhotosPage());

    expect(screen.getByRole("alert").textContent).toContain(
      "No pudimos leer la galería",
    );
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  // AC-E2-2
  it("says Supabase is missing when it is not configured", async () => {
    withAuthorization(credentials);
    fake = null;

    render(await AdminPhotosPage());

    expect(screen.getByRole("alert").textContent).toContain(
      "falta configurar Supabase",
    );
  });
});
