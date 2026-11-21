import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterCount } from "@/components/admin/character-count";
import { GalleryHeader } from "@/components/admin/gallery-header";
import { PhotoDropzone } from "@/components/admin/photo-dropzone";
import { SaveProgress } from "@/components/admin/save-progress";

afterEach(cleanup);

describe("GalleryHeader (UI-1)", () => {
  it("counts the photos and puts «Agregar foto» first", () => {
    render(
      <GalleryHeader
        count={5}
        max={24}
        panelId="panel"
        panelOpen={false}
        onAdd={() => {}}
      />,
    );

    expect(screen.getByText("5 de 24 fotos")).toBeTruthy();
    const add = screen.getByRole("button", { name: "Agregar foto" });
    expect(add).toHaveProperty("disabled", false);
    expect(add.getAttribute("aria-expanded")).toBe("false");
  });

  it("disables adding at 24 photos and says why", () => {
    render(
      <GalleryHeader
        count={24}
        max={24}
        panelId="panel"
        panelOpen={false}
        onAdd={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Agregar foto" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getByText("24 de 24 fotos · quita una para agregar otra"),
    ).toBeTruthy();
  });
});

describe("CharacterCount (UI-5)", () => {
  it("says the count, and out of range says so in words", () => {
    const { rerender } = render(
      <CharacterCount id="c" length={42} min={10} max={300} />,
    );
    expect(screen.getByText("42 / 300").id).toBe("c");

    rerender(<CharacterCount id="c" length={4} min={10} max={300} />);
    expect(screen.getByText("4 / 300 · mínimo 10")).toBeTruthy();

    rerender(<CharacterCount id="c" length={312} max={300} />);
    expect(screen.getByText("312 / 300 · sobran 12")).toBeTruthy();
  });
});

describe("PhotoDropzone (UI-3)", () => {
  it("is the label of a real, focusable file input", () => {
    render(
      <PhotoDropzone
        id="photo"
        disabled={false}
        busy={false}
        onFile={() => {}}
      />,
    );

    const input = screen.getByLabelText(/Elige una foto/) as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.closest("label")).not.toBeNull();
    // Visually hidden, never `display: none`: it must stay in the tab order.
    expect(input.className).toContain("sr-only");
    expect(input.accept).toBe("image/jpeg,image/png,image/webp");
  });

  it("takes a dropped file", () => {
    const onFile = vi.fn();
    render(
      <PhotoDropzone
        id="photo"
        disabled={false}
        busy={false}
        onFile={onFile}
      />,
    );
    const file = new File(["x"], "casa.jpg", { type: "image/jpeg" });
    const zone = screen.getByLabelText(/Elige una foto/).closest("label");

    fireEvent.dragOver(zone as HTMLElement);
    expect(zone?.hasAttribute("data-over")).toBe(true);
    fireEvent.drop(zone as HTMLElement, { dataTransfer: { files: [file] } });

    expect(onFile).toHaveBeenCalledWith(file);
    expect(zone?.hasAttribute("data-over")).toBe(false);
  });

  it("ignores a drop while disabled", () => {
    const onFile = vi.fn();
    render(<PhotoDropzone id="photo" disabled busy={false} onFile={onFile} />);
    const zone = screen.getByLabelText(/Elige una foto/).closest("label");

    fireEvent.drop(zone as HTMLElement, {
      dataTransfer: { files: [new File(["x"], "a.jpg")] },
    });
    expect(onFile).not.toHaveBeenCalled();
  });
});

describe("SaveProgress (UI-8)", () => {
  // Since the move to Supabase, saving publishes: no separate waiting step.
  it("says each step's state in words, not only with an icon", () => {
    const { rerender } = render(
      <SaveProgress size={{ width: 2400, height: 1800 }} />,
    );
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      [
        "Foto preparada (2400 × 1800 px) (hecho)",
        "Guardando y publicando… (en curso)",
      ],
    );

    rerender(<SaveProgress />);
    expect(screen.getAllByRole("listitem")[0].textContent).toBe(
      "Cambio preparado (hecho)",
    );
  });
});
