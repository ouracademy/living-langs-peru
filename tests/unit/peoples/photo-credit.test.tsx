import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PhotoGallery } from "@/components/peoples/photo-gallery";
import type { Photo } from "@/lib/peoples";

afterEach(cleanup);

const base: Photo = {
  src: "/peoples/ashaninka/x.jpg",
  width: 800,
  height: 600,
  alt: "Una casa comunal de techo de palma junto al río.",
  caption: "Casa comunal, 2026.",
  credit: {
    author: "Carly Rojas",
    license: "CC BY-SA 2.0",
    url: "https://commons.wikimedia.org/wiki/File:X.jpg",
  },
};

describe("gallery credit", () => {
  // AC-M3-2: the license links to the file's home page when it has one.
  it("links the license to the source page", () => {
    render(<PhotoGallery photos={[base]} />);

    const link = screen.getByRole("link", { name: "CC BY-SA 2.0" });
    expect(link.getAttribute("href")).toBe(base.credit.url);
    expect(screen.getByText(/Carly Rojas ·/)).toBeTruthy();
  });

  // 2026-11-18: no source page, no link — the credit stays visible as text.
  it("shows author and license as text when there is no source page", () => {
    render(
      <PhotoGallery
        photos={[
          {
            ...base,
            credit: { author: "Living Langs Peru", license: "Foto del equipo" },
          },
        ]}
      />,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Foto del equipo")).toBeTruthy();
    expect(screen.getByText(/Living Langs Peru ·/)).toBeTruthy();
  });
});
