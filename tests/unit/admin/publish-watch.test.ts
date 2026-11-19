import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { describePhotoSize } from "@/lib/admin/license-suggestions";
import {
  PUBLISH_CHECK_INTERVAL_MS,
  PUBLISH_TIMEOUT_MS,
  watchPublication,
} from "@/lib/admin/publish-watch";

const SRC = "/peoples/ashaninka/2026-11-18-abc123.jpg";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("watchPublication (UI-9)", () => {
  it("checks every 15 s without cache and says when the file answers", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const onChange = vi.fn();
    watchPublication(SRC, { fetchImpl, onChange });

    expect(fetchImpl).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(PUBLISH_CHECK_INTERVAL_MS);
    expect(fetchImpl).toHaveBeenCalledWith(SRC, {
      method: "HEAD",
      cache: "no-store",
    });
    expect(onChange).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PUBLISH_CHECK_INTERVAL_MS);
    expect(onChange).toHaveBeenCalledWith("published");
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    // It stops asking once the photo is live.
    await vi.advanceTimersByTimeAsync(PUBLISH_CHECK_INTERVAL_MS * 4);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gives up after 5 minutes and says it is slow", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const onChange = vi.fn();
    watchPublication(SRC, { fetchImpl, onChange });

    await vi.advanceTimersByTimeAsync(PUBLISH_TIMEOUT_MS);
    expect(onChange).toHaveBeenCalledWith("slow");
    const asked = fetchImpl.mock.calls.length;

    await vi.advanceTimersByTimeAsync(PUBLISH_CHECK_INTERVAL_MS * 4);
    expect(fetchImpl.mock.calls.length).toBe(asked);
  });

  it("keeps waiting through a network error", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const onChange = vi.fn();
    watchPublication(SRC, { fetchImpl, onChange });

    await vi.advanceTimersByTimeAsync(PUBLISH_CHECK_INTERVAL_MS * 2);
    expect(onChange).toHaveBeenCalledExactlyOnceWith("published");
  });

  it("stops when asked, before any answer", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    const onChange = vi.fn();
    const stop = watchPublication(SRC, { fetchImpl, onChange });

    stop();
    await vi.advanceTimersByTimeAsync(PUBLISH_TIMEOUT_MS);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("describePhotoSize (UI-4)", () => {
  it("says size and weight in Spanish format", () => {
    expect(describePhotoSize(2400, 1800, 1.2 * 1024 * 1024)).toBe(
      "2400 × 1800 px · 1,2 MB",
    );
  });
});
