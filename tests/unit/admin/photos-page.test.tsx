import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestHeaders = vi.fn(async () => new Headers());
vi.mock("next/headers", () => ({ headers: requestHeaders }));
// The editor refreshes the route after a save; there is no app router here.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { default: AdminPhotosPage, metadata } =
  await import("@/app/admin/fotos/page");

const gallery = readFileSync(
  join(process.cwd(), "src/data/peoples/ashaninka.json"),
  "utf8",
);
const credentials = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;

function withAuthorization(value: string | null) {
  requestHeaders.mockResolvedValue(
    new Headers(value ? { authorization: value } : {}),
  );
}

function githubAnswering(file: string) {
  return vi.fn(async (input: string | URL | Request) =>
    String(input).includes("/git/ref/heads/")
      ? Response.json({ object: { sha: "c".repeat(40) } })
      : new Response(file),
  );
}

beforeEach(() => {
  vi.stubEnv("ADMIN_USER", "editora");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
  vi.stubEnv("GITHUB_REPOSITORY", "ouracademy/living-langs-peru");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("/admin/fotos", () => {
  // AC-E1-5
  it("is never indexed", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("shows nothing of the gallery without valid credentials", async () => {
    withAuthorization(null);
    const fetchMock = githubAnswering(gallery);
    vi.stubGlobal("fetch", fetchMock);

    render(await AdminPhotosPage());

    expect(
      screen.getByRole("heading", { name: "Acceso restringido" }),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // AC-E2-1
  it("lists the five photos of the branch in order, with their credit", async () => {
    withAuthorization(credentials);
    vi.stubGlobal("fetch", githubAnswering(gallery));

    render(await AdminPhotosPage());

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    const photos = JSON.parse(gallery).photos as { alt: string }[];
    photos.forEach((photo, index) => {
      expect(items[index].textContent).toContain(photo.alt);
    });
    expect(screen.getByText(/tardan 1–2 minutos/)).toBeTruthy();
    expect(screen.getByText(/cierra el navegador/)).toBeTruthy();
  });

  // AC-E2-2
  it("shows the error and no list when GitHub cannot be read", async () => {
    withAuthorization(credentials);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    render(await AdminPhotosPage());

    expect(screen.getByRole("alert").textContent).toContain(
      "No pudimos leer la galería",
    );
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
