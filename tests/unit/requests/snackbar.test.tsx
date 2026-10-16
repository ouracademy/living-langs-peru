import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Snackbar } from "@/components/ui/snackbar";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Snackbar", () => {
  it("keeps an empty live region while closed", () => {
    render(
      <Snackbar open={false} onClose={() => {}}>
        Listo
      </Snackbar>,
    );

    const region = screen.getByRole("status");
    expect(region.textContent).toBe("");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it("shows its message in the live region when open", () => {
    render(
      <Snackbar open onClose={() => {}}>
        Listo
      </Snackbar>,
    );

    expect(screen.getByRole("status").textContent).toContain("Listo");
  });

  it("closes itself after the duration", () => {
    const onClose = vi.fn();
    render(
      <Snackbar open onClose={onClose} duration={1000}>
        Listo
      </Snackbar>,
    );

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not start a timer while closed", () => {
    const onClose = vi.fn();
    render(
      <Snackbar open={false} onClose={onClose} duration={1000}>
        Listo
      </Snackbar>,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes from its button", () => {
    const onClose = vi.fn();
    render(
      <Snackbar open onClose={onClose}>
        Listo
      </Snackbar>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
